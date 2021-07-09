import { Injectable } from '@nestjs/common'
import { PoolSwapAggregation, PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { Indexer, RawBlock } from './_abstract'
import { OP_DEFI_TX, PoolSwap } from '@defichain/jellyfish-transaction'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'
import { roundTimestampMinutes } from '@src/utils'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'
import { NotFoundIndexerError } from '../error'

@Injectable()
export class PoolSwapAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: PoolSwapAggregationMapper,
    private readonly poolPairMapper: PoolPairMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        // grab poolswap tx only
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547873')) { // 44665478 -> DFTX, 73 -> s -> poolswap
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data: PoolSwap = (stack[1] as OP_DEFI_TX).tx.data
        const fromTokenId = data.fromTokenId.toString()
        const toTokenId = data.toTokenId.toString()

        const poolpair = await this.getPoolPair(fromTokenId, toTokenId)
        if (poolpair === undefined) {
          throw new NotFoundIndexerError('index', 'PoolSwap->PoolPair', `${fromTokenId}<->${toTokenId}`)
        }

        const { poolId } = poolpair

        const bucketId = roundTimestampMinutes(block.time)
        const id = constructId(poolId, bucketId)

        let aggregation = await this.mapper.get(id)
        if (aggregation === undefined) {
          aggregation = PoolSwapAggregationIndexer.newPoolSwapAggregation(poolId, bucketId, fromTokenId)
        }
        aggregation.volume[fromTokenId].total = new BigNumber(aggregation.volume[fromTokenId].total).plus(data.fromAmount)
        aggregation.volume[fromTokenId].count += 1

        await this.mapper.put(aggregation)
      }
    }
  }

  private async getPoolPair (fromTokenId: string, toTokenId: string): Promise<PoolPair | undefined> {
    const poolpair = await this.poolPairMapper.get(constructPoolId(fromTokenId, toTokenId))
    if (poolpair === undefined) {
      return await this.poolPairMapper.get(constructPoolId(toTokenId, fromTokenId))
    }
    return poolpair
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547873')) { // 44665478 -> DFTX, 73 -> s -> poolswap
          continue
        }
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data = (stack[1] as OP_DEFI_TX).tx.data
        const poolId = constructPoolId(data.fromTokenId, data.toTokenId)
        const bucketId = roundTimestampMinutes(block.time)
        const id = constructId(poolId, bucketId)

        await this.mapper.delete(id)
      }
    }
  }

  static newPoolSwapAggregation (poolId: string, bucketId: number, tokenId: string): PoolSwapAggregation {
    return {
      id: constructId(poolId, bucketId),
      poolId: poolId,
      bucketId: bucketId,
      volume: {
        [tokenId]: {
          total: new BigNumber('0'),
          count: 0
        }
      }
    }
  }
}

function constructId (poolId: string, bucketId: number): string {
  return `${poolId}@${bucketId}`
}

function constructPoolId (fromTokenId: string, toTokenId: string): string {
  return `${fromTokenId}-${toTokenId}`
}
