import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CPoolRemoveLiquidity, PoolRemoveLiquidity } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { IndexerError } from '@src/module.indexer/error'

@Injectable()
export class PoolRemoveLiquidityIndexer extends DfTxIndexer<PoolRemoveLiquidity> {
  OP_CODE: number = CPoolRemoveLiquidity.OP_CODE

  constructor (
    private readonly poolPairMapper: PoolPairMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolRemoveLiquidity>): Promise<void> {
    const data = transaction.dftx.data
    const poolPair = await this.poolPairMapper.getLatest(`${data.tokenId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${data.tokenId} not found`)
    }

    const liquidity = data.amount
    const totalLiquidity = new BigNumber(poolPair.totalLiquidity)
    const reserveA = new BigNumber(poolPair.tokenA.reserve)
    const reserveB = new BigNumber(poolPair.tokenB.reserve)

    poolPair.id = `${poolPair.poolPairId}-${block.height}`
    poolPair.block = { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    poolPair.tokenA.reserve = reserveA
      .minus(liquidity.times(poolPair.tokenA.reserve).dividedBy(totalLiquidity)).toFixed(8, BigNumber.ROUND_DOWN)
    poolPair.tokenB.reserve = reserveB
      .minus(liquidity.times(poolPair.tokenB.reserve).dividedBy(totalLiquidity)).toFixed(8, BigNumber.ROUND_DOWN)
    poolPair.totalLiquidity = totalLiquidity.minus(liquidity).toFixed(8, BigNumber.ROUND_DOWN)

    await this.poolPairMapper.put(poolPair)
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PoolRemoveLiquidity>): Promise<void> {
    const data = transaction.dftx.data
    const poolPair = await this.poolPairMapper.getLatest(`${data.tokenId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${data.tokenId} not found`)
    }

    await this.poolPairMapper.delete(`${poolPair.poolPairId}-${block.height}`)
  }
}
