import { Controller, Get, Inject, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpairs'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairService } from './poolpair.service'
import BigNumber from 'bignumber.js'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'
import { fromScript } from '@defichain/jellyfish-address'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist'
import { NetworkName } from '@defichain/jellyfish-network'

@Controller('/poolpairs')
export class PoolPairController {
  constructor (
    protected readonly deFiDCache: DeFiDCache,
    private readonly poolPairService: PoolPairService,
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
    for (const { poolpairId } of result) {
      const info = await this.poolPairMapper.getLatest(`${poolpairId}`)
      if (info === undefined) {
        continue
      }

      const totalLiquidityUsd = await this.poolPairService.getTotalLiquidityUsd(info)
      const apr = await this.poolPairService.getAPR(info)
      const lpSplits = await this.poolPairService.getLPSplits()
      items.push(this.mapPoolPair(`${poolpairId}`, info, totalLiquidityUsd, apr, lpSplits))
    }

    return ApiPagedResponse.of(items, query.size, item => {
      return item.id
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
      name: info.pairSymbol,
      status: info.status ? 'enabled' : 'disabled',
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
        usd: totalLiquidityUsd?.toFixed()
      },
      tradeEnabled: (new BigNumber(info.tokenA.reserve)).gte(1000) && (new BigNumber(info.tokenB.reserve)).gte(1000),
      ownerAddress: ownerAddress?.address ?? '',
      rewardPct: lpSplits?.[info.poolPairId] ?? 0,
      customRewards: info.customRewards,
      creation: {
        tx: info.creationTx,
        height: info.creationHeight
      },
      apr
    }
  }
}
