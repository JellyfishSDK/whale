import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokenInfo, TokenResult } from '@defichain/jellyfish-api-core/dist/category/token'
import { CachePrefix, GlobalCache } from '@src/module.api/cache/global.cache'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { GetLoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'
import BigNumber from 'bignumber.js'

@Injectable()
export class DeFiDCache extends GlobalCache {
  constructor (
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
    super(cacheManager)
  }

  async batchTokenInfo (ids: string[]): Promise<Record<string, TokenInfo | undefined>> {
    return await this.batch<TokenInfo>(CachePrefix.TOKEN_INFO, ids, this.fetchTokenInfo.bind(this))
  }

  /**
   * @param {string} id numeric id of token
   */
  async getTokenInfo (id: string): Promise<TokenInfo | undefined> {
    return await this.get<TokenInfo>(CachePrefix.TOKEN_INFO, id, this.fetchTokenInfo.bind(this))
  }

  private async fetchTokenInfo (id: string): Promise<TokenInfo | undefined> {
    // You won't get not found error for this
    const result = await this.rpcClient.token.listTokens({
      including_start: true,
      limit: 1,
      start: Number.parseInt(id)
    }, true)

    return result[id]
  }

  async batchTokenInfoBySymbol (symbols: string[]): Promise<Record<string, TokenResult | undefined>> {
    return await this.batch<TokenResult>(CachePrefix.TOKEN_INFO_SYMBOL, symbols, this.fetchTokenInfoBySymbol.bind(this))
  }

  async getTokenInfoBySymbol (symbol: string): Promise<TokenResult | undefined> {
    return await this.get<TokenResult>(CachePrefix.TOKEN_INFO_SYMBOL, symbol, this.fetchTokenInfoBySymbol.bind(this))
  }

  private async fetchTokenInfoBySymbol (symbol: string): Promise<TokenResult | undefined> {
    return await this.rpcClient.token.getToken(symbol)
  }

  async getLoanScheme (id: string): Promise<GetLoanSchemeResult | undefined> {
    return await this.get<GetLoanSchemeResult>(CachePrefix.LOAN_SCHEME_INFO, id, this.fetchLoanSchemeInfo.bind(this))
  }

  private async fetchLoanSchemeInfo (id: string): Promise<GetLoanSchemeResult | undefined> {
    return await this.rpcClient.loan.getLoanScheme(id)
  }

  async getPoolPairInfo (id: string): Promise<PoolPairInfo | undefined> {
    return await this.get<PoolPairInfo>(CachePrefix.POOL_PAIR_INFO, id, this.fetchPoolPairInfo.bind(this))
  }

  private async fetchPoolPairInfo (id: string): Promise<PoolPairInfo | undefined> {
    try {
      const result = await this.rpcClient.poolpair.getPoolPair(id)
      if (result[id] === undefined) {
        return undefined
      }
      return result[id]
    } catch (err: any) {
      /* istanbul ignore else */
      if (err?.payload?.message === 'Pool not found') {
        return undefined
      }
      throw err
    }
  }

  async getStockLpRewardPct (poolId: string): Promise<BigNumber> {
    const all = (await this.get<Record<string, BigNumber>>(
      CachePrefix.GOVERNANCE,
      'LP_LOAN_TOKEN_SPLITS',
      this.fetchAllStockLpRewardPct.bind(this))
    ) as Record<string, BigNumber>

    const thisPool = all[poolId]
    return thisPool === undefined ? new BigNumber(0) : new BigNumber(thisPool)
  }

  private async fetchAllStockLpRewardPct (): Promise<Record<string, BigNumber>> {
    const { LP_LOAN_TOKEN_SPLITS: rewardPct } = await this.rpcClient.masternode.getGov('LP_LOAN_TOKEN_SPLITS')
    if (rewardPct === undefined) {
      // unexpected (absolutely existed in prod)
      throw new Error('LP_LOAN_TOKEN_SPLITS govvar missing')
    }

    const tokenIds = Object.keys(rewardPct)
    const result: Record<string, BigNumber> = {}
    tokenIds.forEach(t => {
      result[t] = new BigNumber(rewardPct[t])
    })

    return result
  }
}
