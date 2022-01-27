import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CompositeSwap, CCompositeSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolSwapIndexer } from './poolswap'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'

@Injectable()
export class CompositeSwapIndexer extends DfTxIndexer<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE

  constructor (
    private readonly poolPairMapper: PoolPairMapper,
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
      const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(poolSwap.fromTokenId, poolSwap.toTokenId)

      if (poolPairToken === undefined) {
        throw new IndexerError(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found`)
      }

      poolIds.push({ id: poolPairToken.poolPairId })
    }

    let swapAmount: BigNumber|undefined
    for (const pool of poolIds) {
      const poolPair = await this.poolPairMapper.getLatest(`${pool.id}`)

      if (poolPair === undefined) {
        throw new IndexerError(`Pool with id ${pool.id} not found`)
      }

      if (swapAmount === undefined) {
        swapAmount = poolSwap.fromAmount
      } else {
        const one = new BigNumber(1.0)
        swapAmount = one.minus(poolPair.commission).times(swapAmount)
      }

      await this.poolSwapIndexer.indexSwap(poolPair, poolSwap.fromTokenId, swapAmount, block, transaction.txn.txid)
    }
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = data.pools
    if (poolIds.length === 0) {
      const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(poolSwap.fromTokenId, poolSwap.toTokenId)

      if (poolPairToken === undefined) {
        throw new IndexerError(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found`)
      }

      poolIds.push({ id: poolPairToken.poolPairId })
    }

    for (const pool of poolIds) {
      await this.poolPairMapper.delete(`${pool.id}-${block.height}`)
    }
  }
}
