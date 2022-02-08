import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CompositeSwap, CCompositeSwap, PoolId, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolSwapIndexer } from './poolswap'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'

@Injectable()
export class CompositeSwapIndexer extends DfTxIndexer<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE

  constructor (
    private readonly poolPairMapper: PoolPairHistoryMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly poolSwapIndexer: PoolSwapIndexer,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = data.pools
    if (poolIds.length === 0) {
      const poolPairToken = await this.poolPairTokenMapper.getPair(poolSwap.fromTokenId, poolSwap.toTokenId)
      if (poolPairToken === undefined) {
        throw new IndexerError(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found`)
      }

      poolIds.push({ id: poolPairToken.poolPairId })
    }

    await this.indexSwaps(poolIds, poolSwap, transaction, block)
  }

  async indexSwaps (poolIds: PoolId[], poolSwap: PoolSwap, transaction: DfTxTransaction<CompositeSwap>, block: RawBlock): Promise<void> {
    let swapAmount: BigNumber = poolSwap.fromAmount
    for (const pool of poolIds) {
      const poolPair = await this.poolPairMapper.getLatest(`${pool.id}`)
      if (poolPair === undefined) {
        throw new IndexerError(`Pool with id ${pool.id} not found`)
      }

      await this.poolSwapIndexer.indexSwap(poolPair, poolSwap.fromTokenId, swapAmount, block,
        transaction.txn.txid, transaction.txnNo)

      const one = new BigNumber(1.0)
      swapAmount = one.minus(poolPair.commission).times(swapAmount)
    }
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = data.pools
    if (poolIds.length === 0) {
      const poolPairToken = await this.poolPairTokenMapper.getPair(poolSwap.fromTokenId, poolSwap.toTokenId)

      if (poolPairToken === undefined) {
        throw new IndexerError(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found`)
      }

      poolIds.push({ id: poolPairToken.poolPairId })
    }

    for (const pool of poolIds) {
      await this.poolSwapIndexer.invalidateSwap(`${pool.id}`, transaction.txn.txid)
    }
  }
}
