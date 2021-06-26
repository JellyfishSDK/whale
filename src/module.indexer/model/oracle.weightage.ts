import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleWeightage, OracleWeightageMapper } from '@src/module.model/oracle.weightage'

@Injectable()
export class OracleWeightageIndexer extends Indexer {
  constructor (
    private readonly mapper: OracleWeightageMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleWeightage> = {}

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
            records[oracleid] = OracleWeightageIndexer.newOracleWeightageAggregration(block, oracleid, weightage)
          }

          if (stack[1].tx.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleid: string = stack[1].tx.data.oracleId
            const weightage = stack[1].tx.data.weightage
            records[oracleid] = OracleWeightageIndexer.newOracleWeightageAggregration(block, oracleid, weightage)
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

  }

  static newOracleWeightageAggregration (
    block: RawBlock,
    oracleid: string,
    weightage: number
  ): OracleWeightage {
    return {
      id: oracleid,
      block: {
        height: block.height
      },
      data: {
        weightage
      }
    }
  }
}
