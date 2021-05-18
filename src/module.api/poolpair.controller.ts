import { Controller, Get, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { PoolPairInfoDto, PoolShareInfoDto } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairInfo, PoolShareInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Controller('/v1/:network/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly poolPairInfoCache: PoolPairInfoCache
  ) {
  }

  /**
   * @param {PaginationQuery} query
   */
  @Get('/')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolPairInfoDto>> {
    // TODO(canonbrother): read cache
    // const poolPairResult = await this.poolPairInfoCache.list(query)

    const poolPairResult = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const poolPairInfosDto = Object.entries(poolPairResult).map(([id, value]) => {
      return mapPoolPair(id, value)
    }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(poolPairInfosDto, query.size, item => {
      return item.id
    })
  }

  /**
   * @param {PaginationQuery} query
   */
  @Get('/shares')
  async listPoolShares (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolShareInfoDto>> {
    // TODO(canonbrother): read cache

    const poolShareResult = await this.rpcClient.poolpair.listPoolShares({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    console.log('poolShareResult: ', poolShareResult)

    const poolShareInfosDto = Object.entries(poolShareResult).map(([id, value]) => {
      return mapPoolShare(id, value)
    }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(poolShareInfosDto, query.size, item => {
      return item.id
    })
  }
}

function mapPoolPair (id: string, poolPairInfo: PoolPairInfo): PoolPairInfoDto {
  return {
    id,
    symbol: poolPairInfo.symbol,
    name: poolPairInfo.name,
    status: poolPairInfo.status,
    idTokenA: poolPairInfo.idTokenA,
    idTokenB: poolPairInfo.idTokenB,
    reserveA: poolPairInfo.reserveA,
    reserveB: poolPairInfo.reserveB,
    commission: poolPairInfo.commission,
    totalLiquidity: poolPairInfo.totalLiquidity,
    'reserveA/reserveB': poolPairInfo['reserveA/reserveB'],
    'reserveB/reserveA': poolPairInfo['reserveB/reserveA'],
    tradeEnabled: poolPairInfo.tradeEnabled,
    ownerAddress: poolPairInfo.ownerAddress,
    blockCommissionA: poolPairInfo.blockCommissionA,
    blockCommissionB: poolPairInfo.blockCommissionB,
    rewardPct: poolPairInfo.rewardPct,
    customRewards: poolPairInfo.customRewards,
    creationTx: poolPairInfo.creationTx,
    creationHeight: poolPairInfo.creationHeight
  }
}

function mapPoolShare (id: string, poolShareInfo: PoolShareInfo): PoolShareInfoDto {
  return {
    id,
    poolID: poolShareInfo.poolID,
    owner: poolShareInfo.owner,
    percent: poolShareInfo['%'],
    amount: poolShareInfo.amount,
    totalLiquidity: poolShareInfo.totalLiquidity
  }
}
