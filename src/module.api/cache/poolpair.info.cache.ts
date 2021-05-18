import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Injectable()
export class PoolPairInfoCache {
  static TTL_SECONDS = 600

  constructor (
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  /**
   * Get poolpair from cache at first, else get poolpair via rpc client
   *
   * @param {string} symbol
   * @return {Promise<PoolPairInfo | undefined>}
   */
  async get (symbol: string): Promise<PoolPairInfo | undefined> {
    let poolPairInfo = await this.cacheManager.get<PoolPairInfo>(symbol)

    if (poolPairInfo !== undefined) {
      return poolPairInfo
    }

    const poolPairResult = await this.rpcClient.poolpair.getPoolPair(symbol, true)
    for (const k in poolPairResult) {
      poolPairInfo = poolPairResult[k]
    }

    await this.cacheManager.set(symbol, poolPairInfo, {
      ttl: PoolPairInfoCache.TTL_SECONDS
    })

    return poolPairInfo
  }
}
