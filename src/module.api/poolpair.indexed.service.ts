import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'
import { PoolPairData } from '@whale-api-client/api/poolpairs'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { TokenMapper } from '@src/module.model/token'

@Injectable()
export class PoolPairIndexedService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache,
    private readonly poolPairMapper: PoolPairMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly tokenMapper: TokenMapper
  ) {
  }

  /**
   * TODO(fuxingloh): graph based matrix resolution
   * Currently implemented with fix pair derivation
   * Ideally should use vertex directed graph where we can always find total liquidity if it can be resolved.
   */
  async getTotalLiquidityUsd (info: PoolPair): Promise<BigNumber | undefined> {
    const USDT_PER_DFI = await this.getUSDT_PER_DFI()
    if (USDT_PER_DFI === undefined) {
      return
    }

    const [a, b] = [info.tokenA.symbol, info.tokenB.symbol]
    if (a === 'DFI') {
      return (new BigNumber(info.tokenA.reserve)).multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }

    if (b === 'DFI') {
      return (new BigNumber(info.tokenB.reserve)).multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }
  }

  async getUSDT_PER_DFI (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('USDT_PER_DFI', async () => {
      // TODO: Improve this, in practical use there's no performance hit as
      // USDT is the 7th or 8th token in the list
      const tokenList = await this.tokenMapper.queryAsc(128)
      const usdtToken = tokenList.find(x => x.symbol === 'USDT')
      if (usdtToken === undefined) {
        return undefined
      }

      const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(0, parseInt(usdtToken.id))
      if (poolPairToken === undefined) {
        return undefined
      }

      const pair = await this.poolPairMapper.getLatest(`${poolPairToken.poolPairId}`)
      if (pair !== undefined) {
        if (pair.tokenA.id === 0) {
          return (new BigNumber(pair.tokenB.reserve)).dividedBy(pair.tokenA.reserve)
        } else if (pair.tokenB.id === 0) {
          return (new BigNumber(pair.tokenA.reserve)).dividedBy(pair.tokenB.reserve)
        }
      }
    }, {
      ttl: 180
    })
  }

  private async getDailyDFIReward (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('LP_DAILY_DFI_REWARD', async () => {
      const rpcResult = await this.rpcClient.masternode.getGov('LP_DAILY_DFI_REWARD')
      return new BigNumber(rpcResult.LP_DAILY_DFI_REWARD)
    }, {
      ttl: 3600 // 60 minutes
    })
  }

  private async getYearlyCustomRewardUSD (info: PoolPair): Promise<BigNumber | undefined> {
    if (info.customRewards === undefined) {
      return new BigNumber(0)
    }

    const dfiPriceUsdt = await this.getUSDT_PER_DFI()
    if (dfiPriceUsdt === undefined) {
      return undefined
    }

    return info.customRewards.reduce<BigNumber>((accum, customReward) => {
      const [reward, token] = customReward.split('@')
      if (token !== '0' && token !== 'DFI') {
        // Unhandled if not DFI
        return accum
      }

      const yearly = new BigNumber(reward)
        .times(60 * 60 * 24 / 30) // 30 seconds = 1 block
        .times(365) // 1 year
        .times(dfiPriceUsdt)

      return accum.plus(yearly)
    }, new BigNumber(0))
  }

  private async getYearlyRewardPCTUSD (info: PoolPair): Promise<BigNumber | undefined> {
    const lpSplits = await this.getLPSplits()
    if (lpSplits === undefined) {
      return new BigNumber(0)
    }
    const rewardPct = lpSplits[parseInt(info.poolPairId)]
    if (rewardPct === undefined) {
      return new BigNumber(0)
    }

    const dfiPriceUsdt = await this.getUSDT_PER_DFI()
    const dailyDfiReward = await this.getDailyDFIReward()

    if (dfiPriceUsdt === undefined || dailyDfiReward === undefined) {
      return undefined
    }

    const rewardPctBigNum = new BigNumber(rewardPct)
    return rewardPctBigNum
      .times(dailyDfiReward)
      .times(365)
      .times(dfiPriceUsdt)
  }

  async getLPSplits (): Promise<Record<string, any> | undefined> {
    return await this.cache.get<Record<string, any>>('LP_SPLITS', async () => {
      const rpcResult = await this.rpcClient.masternode.getGov('LP_SPLITS')
      return rpcResult.LP_SPLITS
    }, {
      ttl: 3600 // 60 minutes
    })
  }

  async getAPR (info: PoolPair): Promise<PoolPairData['apr'] | undefined> {
    const customUSD = await this.getYearlyCustomRewardUSD(info)
    const pctUSD = await this.getYearlyRewardPCTUSD(info)
    const totalLiquidityUSD = await this.getTotalLiquidityUsd(info)

    if (customUSD === undefined || pctUSD === undefined || totalLiquidityUSD === undefined) {
      return {
        reward: 0,
        total: 0
      }
    }

    const yearlyUSD = customUSD.plus(pctUSD)
    // 1 == 100%, 0.1 = 10%
    const apr = yearlyUSD.div(totalLiquidityUSD)

    if (apr.isNaN()) {
      return {
        reward: 0,
        total: 0
      }
    }

    return {
      reward: apr.toNumber(),
      total: apr.toNumber()
    }
  }
}
