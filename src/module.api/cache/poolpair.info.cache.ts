import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairInfoDto } from '@whale-api-client/api/poolpair'

@Injectable()
export class PoolPairInfoCache {
  static TTL_SECONDS = 600

  constructor (
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  /**
   * Get poolpair from cache
   *
   * @param {string} symbol
   * @return {Promise<PoolPairInfoDto | undefined>}
   */
  async get (symbol: string): Promise<PoolPairInfoDto | undefined> {
    return await this.cacheManager.get<PoolPairInfoDto>(symbol)
  }

  /**
   * Set poolpair in cache
   *
   * @param {string} symbol
   * @return {Promise<void>}
   */
  async set (symbol: string, poolPairInfoDto: PoolPairInfoDto): Promise<void> {
    await this.cacheManager.set(symbol, poolPairInfoDto, {
      ttl: PoolPairInfoCache.TTL_SECONDS
    })
  }
}
