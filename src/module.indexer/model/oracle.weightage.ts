import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleWeightage, OracleWeightageMapper, WeightageStatus } from '@src/module.model/oracle.weightage'

@Injectable()
export class OracleWeightageIndexer extends Indexer {
  constructor (private readonly mapper: OracleWeightageMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleWeightage> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          const oracleId: string = txn.txid
          const weightage = stack[1].tx.data.weightage
          records[oracleId] = OracleWeightageIndexer.newOracleWeightage(block, oracleId, weightage, WeightageStatus.LIVE)
        }

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId
          const weightage = stack[1].tx.data.weightage
          records[oracleId] = OracleWeightageIndexer.newOracleWeightage(block, oracleId, weightage, WeightageStatus.LIVE)
        }

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId
          records[oracleId] = OracleWeightageIndexer.newOracleWeightage(block, oracleId, 0, WeightageStatus.REMOVED)
        }
      }
    }

    for (const aggregation of Object.values(records)) {
      // const latest = await this.mapper.getLatest(aggregation.id)
      // if (latest !== undefined) {
      //   aggregation.data.weightage = latest.data.weightage
      // }

      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1].tx.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          const oracleId: string = txn.txid
          await this.mapper.delete(oracleId)
        }
      }
    }
  }

  static newOracleWeightage (
    block: RawBlock,
    oracleId: string,
    weightage: number,
    state: WeightageStatus
  ): OracleWeightage {
    return {
      id: oracleId,
      block: {
        height: block.height
      },
      data: {
        weightage
      },
      state
    }
  }
}
