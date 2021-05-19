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
   * @param {string} id
   * @return {Promise<PoolPairInfoDto | undefined>}
   */
  async get (id: string): Promise<PoolPairInfoDto | undefined> {
    return await this.cacheManager.get<PoolPairInfoDto>(id)
  }

  /**
   * Set poolpair in cache
   *
   * @param {string} id
   * @return {Promise<void>}
   */
  async set (id: string, poolPairInfoDto: PoolPairInfoDto): Promise<void> {
    await this.cacheManager.set(id, poolPairInfoDto, {
      ttl: PoolPairInfoCache.TTL_SECONDS
    })
  }
}
