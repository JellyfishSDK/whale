import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { GlobalCache } from '@src/module.api/cache/global.cache'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

export enum CachePrefix {
  TOKEN_INFO,
  POOL_PAIR_INFO
}

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

  async getTokenInfo (id: string): Promise<TokenInfo | undefined> {
    return await this.get<TokenInfo>(CachePrefix.TOKEN_INFO, id, this.fetchTokenInfo.bind(this))
  }

  private async fetchTokenInfo (id: string): Promise<TokenInfo | undefined> {
    const result = await this.rpcClient.token.listTokens({
      including_start: true,
      limit: 1,
      start: Number.parseInt(id)
    }, true)

    const tokens = Object.values(result)

    /* istanbul ignore if  */
    if (tokens.length === 0) {
      return undefined
    }

    return tokens[0]
  }

  async getPoolPairInfo (id: string): Promise<PoolPairInfo | undefined> {
    return await this.get<PoolPairInfo>(CachePrefix.POOL_PAIR_INFO, id, this.fetchPoolPairInfo.bind(this))
  }

  private async fetchPoolPairInfo (id: string): Promise<PoolPairInfo | undefined> {
    const result = await this.rpcClient.poolpair.getPoolPair(id)

    /* istanbul ignore if  */
    if (result[id] === undefined) {
      return undefined
    }

    return result[id]
  }
}
