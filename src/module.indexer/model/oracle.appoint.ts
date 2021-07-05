import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointMapper } from '@src/module.model/oracle.appoint'
import { OracleState, OracleAppoint } from '@whale-api-client/api/oracle'

@Injectable()
export class OracleAppointIndexer extends Indexer {
  constructor (
    private readonly appointMapper: OracleAppointMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleAppoint> = {}

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
          const weightage: number = stack[1].tx.data.weightage
          records[`${oracleId}-${block.height}`] = OracleAppointIndexer.newOracleStatus(block.height, oracleId, weightage, OracleState.LIVE)
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId
          const oldStatus = await this.appointMapper.getLatest(oracleId)
          const oldHeight: number = oldStatus?.block.height ?? 0
          const oldWeightage: number = oldStatus?.data.weightage ?? 0
          records[`${oracleId}-${oldHeight}`] = OracleAppointIndexer.newOracleStatus(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)
          const weightage: number = stack[1].tx.data.weightage
          records[`${oracleId}-${block.height}`] = OracleAppointIndexer.newOracleStatus(block.height, oracleId, weightage, OracleState.LIVE)
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId

          const oldStatus = await this.appointMapper.getLatest(oracleId)
          const oldHeight: number = oldStatus?.block.height ?? 0
          const oldWeightage: number = oldStatus?.data.weightage ?? 0

          records[`${oracleId}-${oldHeight}`] = OracleAppointIndexer.newOracleStatus(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)
        }
      }
    }

    for (const status of Object.values(records)) {
      await this.appointMapper.put(status)
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
      await this.appointMapper.delete(id)
    }
  }

  static newOracleStatus (
    height: number,
    oracleId: string,
    weightage: number,
    state: OracleState
  ): OracleAppoint {
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
