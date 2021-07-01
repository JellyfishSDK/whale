import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { PoolPairService } from './poolpair.service'
import BigNumber from 'bignumber.js'

@Controller('/v1/:network/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    private readonly poolPairService: PoolPairService
  ) {
  }

  /**
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolPairData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolPairData>> {
    const poolPairsData = await this.poolPairService.list(query)

    return ApiPagedResponse.of(poolPairsData, query.size, item => {
      return item.id
    })
  }

  /**
   * @param {string} id of pool pair
   * @return {Promise<PoolPairData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<PoolPairData> {
    return await this.poolPairService.get(id)
  }
}

export function mapPoolPair (id: string, poolPairInfo: PoolPairInfo): PoolPairData {
  return {
    id,
    symbol: poolPairInfo.symbol,
    name: poolPairInfo.name,
    status: poolPairInfo.status,
    tokenA: {
      id: poolPairInfo.idTokenA,
      reserve: poolPairInfo.reserveA,
      blockCommission: poolPairInfo.blockCommissionA
    },
    tokenB: {
      id: poolPairInfo.idTokenB,
      reserve: poolPairInfo.reserveB,
      blockCommission: poolPairInfo.blockCommissionB
    },
    priceRatio: {
      'tokenA/tokenB': poolPairInfo['reserveA/reserveB'],
      'tokenB/tokenA': poolPairInfo['reserveB/reserveA']
    },
    commission: poolPairInfo.commission,
    totalLiquidity: poolPairInfo.totalLiquidity,
    totalLiquidityUsd: new BigNumber(0),
    tradeEnabled: poolPairInfo.tradeEnabled,
    ownerAddress: poolPairInfo.ownerAddress,
    rewardPct: poolPairInfo.rewardPct,
    customRewards: poolPairInfo.customRewards,
    creation: {
      tx: poolPairInfo.creationTx,
      height: poolPairInfo.creationHeight.toNumber()
    }
  }
}
