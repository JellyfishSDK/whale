import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleStatus, OracleStatusMapper } from '@src/module.model/oracle.status'
import { OracleState } from '@whale-api-client/api/oracle'

@Injectable()
export class OracleStatusIndexer extends Indexer {
  constructor (private readonly mapper: OracleStatusMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleStatus> = {}

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
          const id = `${oracleId}-${block.height}`
          records[id] = OracleStatusIndexer.newOracleStatus(block, oracleId, weightage, OracleState.LIVE)
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId
          const weightage = stack[1].tx.data.weightage
          const id = `${oracleId}-${block.height}`
          records[id] = OracleStatusIndexer.newOracleStatus(block, oracleId, weightage, OracleState.LIVE)
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId
          const id = `${oracleId}-${block.height}`
          records[id] = OracleStatusIndexer.newOracleStatus(block, oracleId, 0, OracleState.REMOVED)
        }
      }
    }

    for (const aggregation of Object.values(records)) {
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
          const id = `${oracleId}-${block.height}`
          await this.mapper.delete(id)
        }
      }
    }
  }

  static newOracleStatus (
    block: RawBlock,
    oracleId: string,
    weightage: number,
    state: OracleState
  ): OracleStatus {
    return {
      id: `${oracleId}-${block.height}`,
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
