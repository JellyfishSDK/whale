import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OracleState, OracleAppointed } from '@whale-api-client/api/oracle'

@Injectable()
export class OracleAppointedIndexer extends Indexer {
  constructor (
    private readonly mapper: OracleAppointedMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleAppointed> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[0]?.type === 'OP_RETURN' || stack[0]?.code === '106') {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid

            const weightage: number = stack[1].tx.data.weightage

            records[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointed(block.height, oracleId, weightage, OracleState.LIVE)
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            const oldStatus = await this.mapper.getLatest(oracleId)
            const oldHeight: number = oldStatus?.block.height ?? 0
            const oldWeightage: number = oldStatus?.data.weightage ?? 0
            records[`${oracleId}-${oldHeight}`] = OracleAppointedIndexer.newOracleAppointed(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)

            const weightage: number = stack[1].tx.data.weightage
            records[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointed(block.height, oracleId, weightage, OracleState.LIVE)
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            const oldStatus = await this.mapper.getLatest(oracleId)
            const oldHeight: number = oldStatus?.block.height ?? 0
            const oldWeightage: number = oldStatus?.data.weightage ?? 0

            records[`${oracleId}-${oldHeight}`] = OracleAppointedIndexer.newOracleAppointed(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)
          }
        }
      }
    }

    for (const status of Object.values(records)) {
      await this.mapper.put(status)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const ids: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          const oracleId: string = txn.txid
          ids.push(`${oracleId}-${block.height}`)
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId
          ids.push(`${oracleId}-${block.height}`)
        }
      }
    }

    for (const id of ids) {
      await this.mapper.delete(id)
    }
  }

  static newOracleAppointed (
    height: number,
    oracleId: string,
    weightage: number,
    state: OracleState
  ): OracleAppointed {
    return {
      id: `${oracleId}-${height}`,
      block: {
        height
      },
      data: {
        oracleId,
        weightage
      },
      state
    }
  }
}
