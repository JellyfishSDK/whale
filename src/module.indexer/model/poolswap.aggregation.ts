import { Injectable } from '@nestjs/common'
import { PoolSwapAggregation, PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { Indexer, RawBlock } from './_abstract'
import { OP_DEFI_TX } from '@defichain/jellyfish-transaction/dist/script/defi'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'

@Injectable()
export class PoolSwapAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: PoolSwapAggregationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        // grab poolswap tx only
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547873')) {
          continue
        }
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data = (stack[1] as OP_DEFI_TX).tx.data
        const poolId = constructPoolId(data.fromTokenId, data.toTokenId)
        // WEIRD(canonbrother): add suffix is to prevent test spy.on conflicts
        const bucketId = roundMinutes(block.time) + 'u'
        const id = constructId(poolId, bucketId)

        let aggregation = await this.mapper.get(id)
        if (aggregation === undefined) {
          aggregation = PoolSwapAggregationIndexer.newPoolSwapAggregation(poolId, bucketId)
        }
        aggregation.total = new BigNumber(aggregation.total).plus(data.fromAmount)
        aggregation.count += 1

        await this.mapper.put(aggregation)
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547873')) {
          continue
        }
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data = (stack[1] as OP_DEFI_TX).tx.data
        const poolId = constructPoolId(data.fromTokenId, data.toTokenId)
        const bucketId = roundMinutes(block.time)
        const id = constructId(poolId, bucketId)

        await this.mapper.delete(id)
      }
    }
  }

  static newPoolSwapAggregation (poolId: string, bucketId: string): PoolSwapAggregation {
    return {
      id: constructId(poolId, bucketId),
      poolId: poolId,
      bucketId: bucketId,
      total: new BigNumber('0'),
      count: 0
    }
  }
}

function roundMinutes (timestamp: number): string {
  const ts = String(timestamp).length === 10 ? timestamp * 1000 : timestamp
  const round = 1000 * 60 * 10
  const dateTime = new Date(Math.floor(ts / round) * round).toISOString()

  // remove seconds and milliseconds
  return dateTime.substr(0, dateTime.length - 8)
}

function constructId (poolId: string, bucketId: string): string {
  return `${poolId}@${bucketId}`
}

function constructPoolId (fromTokenId: string, toTokenId: string): string {
  const sortedTokenIds = [fromTokenId, toTokenId].sort((a, b) => a.localeCompare(b))
  return `${sortedTokenIds[0]}-${sortedTokenIds[1]}`
}
