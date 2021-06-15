import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairsResult } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Injectable()
export class PoolPairService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly poolPairInfoCache: PoolPairInfoCache
  ) {
  }

  async list (query: PaginationQuery): Promise<PoolPairsResult> {
    // TODO(canonbrother): getting cache here else call rpc

    // Price Ratio = reserveA (larger) / reserveB (smaller)
    // APR = 296878.1184 (getgov LP_DAILY_DFI_REWARD) * rewardPct * 365 *
    // Liquidity (USD) = reserveA + reserveB
    // Daily Volume (USD)
    //  30 Day Average
    //  1 Day

    const poolPairResult = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const poolpairs = []
    for (const id of Object.keys(poolPairResult)) {
      poolpairs.push({ ...poolPairResult[id], id })
    }

    // fetch volume
    // tradeVolume = tokensTradeValume.leveldb.query({ blocktime: { gte: startDate, lt: endDate }})
    // dailyTradeVolume are the number of poolswap per day

    // get lpDailyDfiReward  by calling rpc `getgov`
    // const { ['LP_DAILY_DFI_REWARD']: lpDailyDfiReward } = await container.call('getgov' ['LP_DAILY_DFI_REWARD'])

    // get token price by calling rpc `testpoolswap`

    return poolPairResult
  }
}
