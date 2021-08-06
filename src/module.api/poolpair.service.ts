import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'

@Injectable()
export class PoolPairService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache
  ) {
  }

  /**
   * Get PoolPair where the order of token doesn't matter
   */
  private async getPoolPair (a: string, b: string): Promise<PoolPairInfo | undefined> {
    try {
      const result = await this.rpcClient.poolpair.getPoolPair(`${a}-${b}`, true)
      if (Object.values(result).length > 0) {
        return Object.values(result)[0]
      }
    } catch (err) {
      if (err?.payload?.message !== 'Pool not found') {
        throw err
      }
    }

    try {
      const result = await this.rpcClient.poolpair.getPoolPair(`${b}-${a}`, true)
      if (Object.values(result).length > 0) {
        return Object.values(result)[0]
      }
    } catch (err) {
      if (err?.payload?.message !== 'Pool not found') {
        throw err
      }
    }
  }

  /**
   * TODO(fuxingloh): graph based matrix resolution
   * Currently implemented with fix pair derivation
   * Ideally should use vertex directed graph where we can always find total liquidity if it can be resolved.
   */
  async getTotalLiquidityUsd (info: PoolPairInfo): Promise<BigNumber | undefined> {
    const USDT_PER_DFI = await this.getUSDT_PER_DFI()
    if (USDT_PER_DFI === undefined) {
      return
    }

    const [a, b] = info.symbol.split('-')
    if (a === 'DFI') {
      return info.reserveA.multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }

    if (b === 'DFI') {
      return info.reserveB.multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }
  }

  async getUSDT_PER_DFI (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('USDT_PER_DFI', async () => {
      const pair = await this.getPoolPair('DFI', 'USDT')
      if (pair !== undefined) {
        if (pair.idTokenA === '0') {
          return new BigNumber(pair['reserveB/reserveA'])
        } else if (pair.idTokenB === '0') {
          return new BigNumber(pair['reserveA/reserveB'])
        }
      }
    }, {
      ttl: 180
    })
  }

  async getDailyDFIReward (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('LP_DAILY_DFI_REWARD', async () => {
      const rpcResult = await this.rpcClient.masternode.getGov('LP_DAILY_DFI_REWARD')
      return new BigNumber(rpcResult.LP_DAILY_DFI_REWARD)
    }, {
      ttl: 180
    })
  }

  async calculateAPRForPoolPair (info: PoolPairInfo): Promise<{ total: number, reward: number }> {
    const dfiPriceUsdt = await this.getUSDT_PER_DFI() ?? 0

    const totalCustomRewards = info.customRewards !== undefined
      ? info.customRewards.reduce<string | BigNumber>((accum, customReward) => {
        const [reward] = customReward.split('@')
        const accumBigNumber = accum as BigNumber
        accumBigNumber.plus(new BigNumber(reward))
          .times(2880)
          .times(365)
          .times(dfiPriceUsdt)
        return accumBigNumber
      }, new BigNumber(0)) : new BigNumber(0)

    const dailyDfiReward = await this.getDailyDFIReward() ?? 0
    const yearlyUSDReward = info.rewardPct
      .times(dailyDfiReward)
      .times(365)
      .times(dfiPriceUsdt)
      .plus(totalCustomRewards)

    const totalLiquidityUSD = await this.getTotalLiquidityUsd(info) ?? 1
    const reward = yearlyUSDReward
      .times(100)
      .div(totalLiquidityUSD)
      .toNumber()

    return {
      reward,
      total: reward
    }
  }
}
