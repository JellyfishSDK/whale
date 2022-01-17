import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolAddLiquidity, CPoolAddLiquidity } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { IndexerError } from '@src/module.indexer/error'

const MINIMUM_LIQUIDITY = 0.00001

@Injectable()
export class PoolAddLiquidityIndexer extends DfTxIndexer<PoolAddLiquidity> {
  OP_CODE: number = CPoolAddLiquidity.OP_CODE

  constructor (
    private readonly poolPairMapper: PoolPairMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolAddLiquidity>): Promise<void> {
    const data = transaction.dftx.data
    const token1 = data.from[0]
    const token2 = data.from[1]
    const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(token1.balances[0].token, token2.balances[0].token)

    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${token1.balances[0].token}, ${token2.balances[0].token} not found`)
    }

    const poolPair = await this.poolPairMapper.getLatest(`${poolPairToken.poolPairId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${poolPairToken.poolPairId} not found`)
    }

    const forward = poolPair.tokenA.id === token1.balances[0].token
    const tokenA = forward ? token1 : token2
    const tokenB = forward ? token2 : token1

    let liquidity = new BigNumber(0)
    let totalLiquidity = new BigNumber(poolPair.totalLiquidity)
    if (totalLiquidity.isEqualTo(0)) {
      liquidity = tokenA.balances[0].amount.times(tokenB.balances[0].amount).sqrt()
      liquidity = liquidity.minus(MINIMUM_LIQUIDITY)
      totalLiquidity = new BigNumber(MINIMUM_LIQUIDITY)
    } else {
      const liqA = tokenA.balances[0].amount.times(totalLiquidity.dividedBy(poolPair.tokenA.reserve))
      const liqB = tokenB.balances[0].amount.times(totalLiquidity.dividedBy(poolPair.tokenB.reserve))
      liquidity = BigNumber.min(liqA, liqB)
    }

    totalLiquidity = totalLiquidity.plus(liquidity)

    poolPair.id = `${poolPair.poolPairId}-${block.height}`
    poolPair.block = { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    poolPair.tokenA.reserve = tokenA.balances[0].amount.plus(poolPair.tokenA.reserve).toFixed(8, BigNumber.ROUND_DOWN)
    poolPair.tokenB.reserve = tokenB.balances[0].amount.plus(poolPair.tokenB.reserve).toFixed(8, BigNumber.ROUND_DOWN)
    poolPair.totalLiquidity = totalLiquidity.toFixed(8, BigNumber.ROUND_DOWN)

    await this.poolPairMapper.put(poolPair)
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PoolAddLiquidity>): Promise<void> {
    const data = transaction.dftx.data
    const tokenA = data.from[0]
    const tokenB = data.from[1]
    const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(tokenA.balances[0].token, tokenB.balances[0].token)

    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${tokenA.balances[0].token}, ${tokenB.balances[0].token} not found`)
    }

    const poolPair = await this.poolPairMapper.getLatest(`${poolPairToken.poolPairId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${poolPairToken.poolPairId} not found`)
    }

    await this.poolPairMapper.delete(`${poolPair.poolPairId}-${block.height}`)
  }
}
