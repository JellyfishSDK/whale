import { ConflictException, Controller, Get, Query } from '@nestjs/common'
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
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolPairInfoDto>>}
   */
  @Get('/')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolPairInfoDto>> {
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
   * @param {string} symbol
   * @return {Promise<PoolPairInfo>}
   */
  @Get('/:symbol')
  async get (symbol: string): Promise<PoolPairInfo> {
    const poolPairInfo = await this.poolPairInfoCache.get(symbol)
    if (poolPairInfo === undefined) {
      throw new ConflictException('unable to find token')
    }
    return poolPairInfo
  }

  /**
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolShareInfoDto>>}
   */
  @Get('/shares')
  async listPoolShares (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolShareInfoDto>> {
    const poolShareResult = await this.rpcClient.poolpair.listPoolShares({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const poolShareInfosDto = Object.entries(poolShareResult).map(([, value]) => {
      return mapPoolShare(value)
    }).sort(a => Number.parseInt(a.poolID))

    return ApiPagedResponse.of(poolShareInfosDto, query.size, item => {
      return item.poolID
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

function mapPoolShare (poolShareInfo: PoolShareInfo): PoolShareInfoDto {
  return {
    poolID: poolShareInfo.poolID,
    owner: poolShareInfo.owner,
    percent: poolShareInfo['%'],
    amount: poolShareInfo.amount,
    totalLiquidity: poolShareInfo.totalLiquidity
  }
}
