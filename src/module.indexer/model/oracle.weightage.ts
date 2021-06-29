import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleWeightage, OracleWeightageMapper } from '@src/module.model/oracle.weightage'

@Injectable()
export class OracleWeightageIndexer extends Indexer {
  constructor (private readonly mapper: OracleWeightageMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const record: Record<string, OracleWeightage> = {}
    const removedOracleIds: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        try {
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid
            const weightage = stack[1].tx.data.weightage
            record[oracleId] = OracleWeightageIndexer.newOracleWeightage(oracleId, weightage)
          }

          if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const weightage = stack[1].tx.data.weightage
            record[oracleId] = OracleWeightageIndexer.newOracleWeightage(oracleId, weightage)
          }

          if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            removedOracleIds.push(oracleId)
          }
        } catch (e) {
          console.log(e)
        }
      }
    }

    for (const aggregation of Object.values(record)) {
      await this.mapper.put(aggregation)
    }

    for (const oracleId of removedOracleIds) {
      await this.mapper.delete(oracleId)
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
    oracleId: string,
    weightage: number
  ): OracleWeightage {
    return {
      id: oracleId,
      data: {
        weightage
      }
    }
  }
}
