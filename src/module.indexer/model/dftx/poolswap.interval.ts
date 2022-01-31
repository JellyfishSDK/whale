import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CPoolSwap, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { PoolSwapAggregated, PoolSwapAggregatedMapper } from '@src/module.model/poolswap.aggregated'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { HexEncoder } from '@src/module.model/_hex.encoder'

export enum PoolSwapIntervalSeconds {
  ONE_HOUR = 60 * 60,
  ONE_DAY = ONE_HOUR * 24
}

export const AggregationIntervals: PoolSwapIntervalSeconds[] = [
  PoolSwapIntervalSeconds.ONE_HOUR,
  PoolSwapIntervalSeconds.ONE_DAY
]

@Injectable()
export class PoolSwapIntervalIndexer extends DfTxIndexer<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  constructor (
    private readonly aggregatedMapper: PoolSwapAggregatedMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper
  ) {
    super()
  }

  async indexBlockStart (block: RawBlock): Promise<void> {
    const poolPairs = await this.poolPairTokenMapper.list(Number.MAX_SAFE_INTEGER)
    for (const poolPair of poolPairs) {
      for (const interval of AggregationIntervals) {
        const previous = await this.aggregatedMapper.query(`${poolPair.poolPairId}-${interval}`, 1)
        if (previous.length === 0 || (block.mediantime - previous[0].block.medianTime) > (interval as number)) {
          await this.startNewBucket(block, poolPair.poolPairId, interval)
        }
      }
    }
  }

  async indexTransaction (_: RawBlock, __: DfTxTransaction<PoolSwap>): Promise<void> {
  }

  private async startNewBucket (block: RawBlock, poolPairId: number, interval: PoolSwapIntervalSeconds): Promise<void> {
    const aggregate: PoolSwapAggregated = {
      id: `${poolPairId}-${interval as number}-${block.height}`,
      key: `${poolPairId}-${interval as number}`,
      sort: HexEncoder.encodeHeight(block.mediantime) + HexEncoder.encodeHeight(block.height),

      aggregated: {
        amounts: {}
      },

      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      }
    }

    await this.aggregatedMapper.put(aggregate)
  }

  async invalidateTransaction (_: RawBlock, __: DfTxTransaction<PoolSwap>): Promise<void> {
  }

  async invalidateBlockStart (block: RawBlock): Promise<void> {
    const poolPairs = await this.poolPairTokenMapper.list(Number.MAX_SAFE_INTEGER)

    for (const poolPair of poolPairs) {
      for (const interval of AggregationIntervals) {
        const previous = await this.aggregatedMapper.query(`${poolPair.poolPairId}-${interval}`, 1)

        if (previous.length !== 0 && previous[0].block.height === block.height) {
          await this.aggregatedMapper.delete(previous[0].id)
        }
      }
    }
  }
}
