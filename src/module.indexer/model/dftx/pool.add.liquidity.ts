import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolAddLiquidity, CPoolAddLiquidity } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'

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

  async index (block: RawBlock, txns: Array<DfTxTransaction<PoolAddLiquidity>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenA = data.from[0]
      const tokenB = data.from[1]
      const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(tokenA.balances[0].token, tokenB.balances[0].token)

      if (poolPairToken === undefined) {
        continue
      }

      const poolPair = await this.poolPairMapper.getLatest(`${poolPairToken.poolpairId}`)
      if (poolPair === undefined) {
        continue
      }

      let liquidity = new BigNumber(0)
      let totalLiquidity = new BigNumber(poolPair.totalLiquidity)
      if (totalLiquidity.isEqualTo(0)) {
        liquidity = tokenA.balances[0].amount.times(tokenB.balances[0].amount)
        liquidity = liquidity.minus(MINIMUM_LIQUIDITY)
        totalLiquidity = new BigNumber(MINIMUM_LIQUIDITY)
      } else {
        const liqA = tokenA.balances[0].amount.times(totalLiquidity.dividedBy(poolPair.tokenA.reserve))
        const liqB = tokenB.balances[0].amount.times(totalLiquidity.dividedBy(poolPair.tokenA.reserve))
        liquidity = BigNumber.min(liqA, liqB)
      }

      totalLiquidity = totalLiquidity.plus(liquidity)

      poolPair.id = `${poolPair.poolPairId}-${block.height}`
      poolPair.block = { hash: block.hash, height: block.height }
      poolPair.tokenA.reserve = tokenA.balances[0].amount.plus(poolPair.tokenA.reserve).toFixed(8)
      poolPair.tokenB.reserve = tokenB.balances[0].amount.plus(poolPair.tokenB.reserve).toFixed(8)
      poolPair.totalLiquidity = totalLiquidity.toFixed(8)

      await this.poolPairMapper.put(poolPair)
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<PoolAddLiquidity>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenA = data.from[0]
      const tokenB = data.from[1]
      const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(tokenA.balances[0].token, tokenB.balances[0].token)

      if (poolPairToken === undefined) {
        continue
      }

      const poolPair = await this.poolPairMapper.getLatest(`${poolPairToken.poolpairId}`)
      if (poolPair !== undefined) {
        await this.poolPairMapper.delete(`${poolPair.poolPairId}-${block.height}`)
      }
    }
  }
}