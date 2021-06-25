import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import {
  OracleWeightageAggregation,
  OracleWeightageAggregationMapper
} from '@src/module.model/oracle.weightage.aggregation'

@Injectable()
export class OracleWeightageAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: OracleWeightageAggregationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleWeightageAggregation> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        try {
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          if (stack[1].tx.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleid: string = txn.txid
            const weightage = stack[1].tx.data.weightage
            records[`${oracleid}-${block.height.toString()}`] = OracleWeightageAggregationIndexer.newOracleWeightageAggregration(block, vout.scriptPubKey.hex, vout.scriptPubKey.type, oracleid, weightage)
          }

          if (stack[1].tx.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleid: string = stack[1].tx.data.oracleId
            const weightage = stack[1].tx.data.weightage
            records[`${oracleid}-${block.height.toString()}`] = OracleWeightageAggregationIndexer.newOracleWeightageAggregration(block, vout.scriptPubKey.hex, vout.scriptPubKey.type, oracleid, weightage)
          }
        } catch (e) {

        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    // const hidList = new Set<string>()
    //
    // for (const txn of block.tx) {
    //   for (const vout of txn.vout) {
    //     hidList.add(HexEncoder.asSHA256(vout.scriptPubKey.hex))
    //   }
    // }
    //
    // for (const hid of hidList) {
    //   await this.mapper.delete(HexEncoder.encodeHeight(block.height) + hid)
    // }
  }

  static newOracleWeightageAggregration (
    block: RawBlock,
    hex: string,
    type: string,
    oracleid: string,
    weightage: number
  ): OracleWeightageAggregation {
    const hid = HexEncoder.asSHA256(hex)

    return {
      id: `${oracleid}-${block.height.toString()}`,
      hid: hid,
      block: {
        hash: block.hash,
        height: block.height
      },
      script: {
        type: type,
        hex: hex
      },
      data: {
        oracleid,
        weightage
      }
    }
  }
}
