import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CCompositeSwap, CompositeSwap, PoolId, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolSwapIndexer } from './pool.swap'
import { PoolPairHistory, PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'

const ONE = new BigNumber(1.0)

@Injectable()
export class CompositeSwapIndexer extends DfTxIndexer<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE

  constructor (
    private readonly poolPairHistoryMapper: PoolPairHistoryMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly poolSwapIndexer: PoolSwapIndexer,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = data.pools.length > 0
      ? data.pools
      : await this.getPoolIdsForTokens(poolSwap.fromTokenId, poolSwap.toTokenId)

    await this.indexSwaps(poolIds, poolSwap, transaction, block)
  }

  async indexSwaps (poolIds: PoolId[], poolSwap: PoolSwap, transaction: DfTxTransaction<CompositeSwap>, block: RawBlock): Promise<void> {
    let fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      const poolPair = await this.getPoolPair(pool.id)
      await this.poolSwapIndexer.indexSwap(block, transaction, poolPair.poolPairId, poolSwap.fromTokenId, poolSwap.fromAmount)
      fromAmount = ONE.minus(poolPair.commission).times(fromAmount)
    }
  }

  async getPoolPair (poolId: number): Promise<PoolPairHistory> {
    // TODO(fuxingloh): we need to cache this too
    const poolPair = await this.poolPairHistoryMapper.getLatest(`${poolId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${poolId} not found`)
    }

    return poolPair
  }

  async getPoolIdsForTokens (fromTokenId: number, toTokenId: number): Promise<PoolId[]> {
    const poolPairToken = await this.poolPairTokenMapper.getPair(fromTokenId, toTokenId)
    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${fromTokenId}, ${toTokenId} not found`)
    }

    return [{ id: poolPairToken.poolPairId }]
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = data.pools.length > 0
      ? data.pools
      : await this.getPoolIdsForTokens(poolSwap.fromTokenId, poolSwap.toTokenId)

    let fromAmount: BigNumber = poolSwap.fromAmount
    for (const pool of poolIds) {
      const poolPair = await this.getPoolPair(pool.id)
      await this.poolSwapIndexer.invalidateSwap(transaction, poolPair.poolPairId, poolSwap.fromTokenId, fromAmount)
      fromAmount = ONE.minus(poolPair.commission).times(fromAmount)
    }
  }
}
