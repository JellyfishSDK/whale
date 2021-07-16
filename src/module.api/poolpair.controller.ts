import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairService, PoolPairInfoPlus } from './poolpair.service'
import BigNumber from 'bignumber.js'

@Controller('/v0/:network/poolpairs')
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
    const poolPairsInfoPlus = await this.poolPairService.list(query)

    const poolPairsData = poolPairsInfoPlus.map(data => {
      return mapPoolPair(data)
    }).sort(a => Number.parseInt(a.id))

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
    const poolPairInfoPlus = await this.poolPairService.get(id)

    return mapPoolPair(poolPairInfoPlus)
  }
}

export function mapPoolPair (poolPairInfoPlus: PoolPairInfoPlus): PoolPairData {
  return {
    id: poolPairInfoPlus.id,
    symbol: poolPairInfoPlus.symbol,
    name: poolPairInfoPlus.name,
    status: poolPairInfoPlus.status,
    tokenA: {
      id: poolPairInfoPlus.idTokenA,
      reserve: poolPairInfoPlus.reserveA.toFixed(),
      blockCommission: poolPairInfoPlus.blockCommissionA.toFixed()
    },
    tokenB: {
      id: poolPairInfoPlus.idTokenB,
      reserve: poolPairInfoPlus.reserveB.toFixed(),
      blockCommission: poolPairInfoPlus.blockCommissionB.toFixed()
    },
    priceRatio: {
      ab: poolPairInfoPlus['reserveA/reserveB'] instanceof BigNumber ? poolPairInfoPlus['reserveA/reserveB'].toFixed() : poolPairInfoPlus['reserveA/reserveB'],
      ba: poolPairInfoPlus['reserveB/reserveA'] instanceof BigNumber ? poolPairInfoPlus['reserveB/reserveA'].toFixed() : poolPairInfoPlus['reserveB/reserveA']
    },
    commission: poolPairInfoPlus.commission.toFixed(),
    totalLiquidity: {
      token: poolPairInfoPlus.totalLiquidity.toFixed(),
      usd: poolPairInfoPlus.totalLiquidityUsd.toFixed()
    },
    tradeEnabled: poolPairInfoPlus.tradeEnabled,
    ownerAddress: poolPairInfoPlus.ownerAddress,
    rewardPct: poolPairInfoPlus.rewardPct.toFixed(),
    customRewards: poolPairInfoPlus.customRewards,
    creation: {
      tx: poolPairInfoPlus.creationTx,
      height: poolPairInfoPlus.creationHeight.toNumber()
    }
  }
}
