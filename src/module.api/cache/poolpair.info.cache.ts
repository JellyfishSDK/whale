import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { PaginationQuery } from '../_core/api.query'

@Injectable()
export class PoolPairInfoCache {
  static TTL_SECONDS = 600

  constructor (
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  async list (query: PaginationQuery): Promise<Record<string, PoolPairInfo>> {
    let records: Record<string, PoolPairInfo> | undefined = await this.cacheManager.get('POOL_PAIRS')
    if (records == null) {
      records = await this.rpcClient.poolpair.listPoolPairs({
        start: query.next !== undefined ? Number(query.next) : 0,
        including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
        limit: query.size
      }, true)

      await this.cacheManager.set('POOL_PAIRS', records, {
        ttl: PoolPairInfoCache.TTL_SECONDS
      })
    }

    return records
  }

  async get (symbol: string): Promise<PoolPairInfo | undefined> {
    let poolPairInfo = await this.cacheManager.get<PoolPairInfo>(symbol)
    if (poolPairInfo !== undefined) {
      return poolPairInfo
    }

    const poolPairResult = await this.rpcClient.poolpair.getPoolPair(symbol, true)
    for (const k in poolPairResult) {
      poolPairInfo = poolPairResult[k]
    }

    await this.cacheManager.set(symbol, poolPairInfo)

    return poolPairInfo
  }
}
