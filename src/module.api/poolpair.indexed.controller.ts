import { Controller, Get, Inject, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpairs.indexed'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import BigNumber from 'bignumber.js'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'
import { fromScript } from '@defichain/jellyfish-address'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist'
import { NetworkName } from '@defichain/jellyfish-network'
import { PoolPairIndexedService } from './poolpair.indexed.service'

@Controller('/poolpairsindexed')
export class PoolPairIndexedController {
  constructor (
    protected readonly deFiDCache: DeFiDCache,
    private readonly poolPairService: PoolPairIndexedService,
    private readonly poolPairMapper: PoolPairMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
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
    const result = await this.poolPairTokenMapper.list(query.size, query.next)

    const items: PoolPairData[] = []
    for (const { poolPairId } of result) {
      const info = await this.poolPairMapper.getLatest(`${poolPairId}`)
      if (info === undefined) {
        continue
      }

      const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(info)
      const apr = await this.poolPairService.getAPR(info)
      const lpSplits = await this.poolPairService.getLPSplits()
      items.push(this.mapPoolPair(`${poolPairId}`, info, totalLiquidityUsd, apr, lpSplits))
    }

    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  /**
   * @param {string} id of pool pair
   * @return {Promise<PoolPairData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<PoolPairData> {
    const poolPair = await this.poolPairMapper.getLatest(id)
    if (poolPair === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(poolPair)
    const apr = await this.poolPairService.getAPR(poolPair)
    const lpSplits = await this.poolPairService.getLPSplits()
    return this.mapPoolPair(String(id), poolPair, totalLiquidityUsd, apr, lpSplits)
  }

  mapPoolPair (id: string, info: PoolPair, totalLiquidityUsd?: BigNumber, apr?: PoolPairData['apr'],
    lpSplits?: Record<string, any>): PoolPairData {
    const ownerScriptBuffer = SmartBuffer.fromBuffer(Buffer.from(info.ownerScript, 'hex'))
    const ownerStack = toOPCodes(ownerScriptBuffer)
    const ownerAddress = fromScript({ stack: ownerStack }, this.network)
    return {
      id: id,
      symbol: info.pairSymbol,
      name: info.name,
      status: info.status,
      sort: info.sort,
      tokenA: {
        symbol: info.tokenA.symbol,
        displaySymbol: info.tokenA.id === 0 ? info.tokenA.symbol : `d${info.tokenA.symbol}`,
        id: `${info.tokenA.id}`,
        reserve: info.tokenA.reserve
      },
      tokenB: {
        symbol: info.tokenB.symbol,
        displaySymbol: info.tokenB.id === 0 ? info.tokenB.symbol : `d${info.tokenB.symbol}`,
        id: `${info.tokenB.id}`,
        reserve: info.tokenB.reserve
      },
      priceRatio: {
        ab: (new BigNumber(info.tokenA.reserve)).dividedBy(info.tokenB.reserve).toFixed(8),
        ba: (new BigNumber(info.tokenB.reserve)).dividedBy(info.tokenA.reserve).toFixed(8)
      },
      commission: info.commission,
      totalLiquidity: {
        token: info.totalLiquidity,
        usd: totalLiquidityUsd?.toFixed(8)
      },
      tradeEnabled: (new BigNumber(info.tokenA.reserve)).gte(0.00001) && (new BigNumber(info.tokenB.reserve)).gte(0.00001),
      ownerAddress: ownerAddress?.address ?? '',
      rewardPct: lpSplits?.[info.poolPairId] !== undefined ? `${lpSplits?.[info.poolPairId] as number}` : '0',
      customRewards: info.customRewards,
      creation: {
        tx: info.creationTx,
        height: info.creationHeight
      },
      apr
    }
  }
}
