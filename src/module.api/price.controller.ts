import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PriceTickerMapper, PriceTicker } from '@src/module.model/price.ticker'
import { ActivePrice, PriceOracle } from '@whale-api-client/api/prices'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Controller('/prices')
export class PriceController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly oraclePriceAggregatedMapper: OraclePriceAggregatedMapper,
    protected readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper
  ) {
  }

  @Get()
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PriceTicker>> {
    const items = await this.priceTickerMapper.query(query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  @Get('/:key')
  async get (
    @Param('key') key: string
  ): Promise<PriceTicker | undefined> {
    return await this.priceTickerMapper.get(key)
  }

  @Get('/:key/active')
  async getActivePrice (
    @Param('key') key: string
  ): Promise<ActivePrice> {
    const priceTicker = await this.priceTickerMapper.get(key)

    if (priceTicker === undefined) {
      throw new NotFoundException('PriceTicker not found')
    }

    const blockHeight = await this.rpcClient.blockchain.getBlockCount()
    const blocksToNext = 120 % blockHeight

    const nextPriceList = await this.oraclePriceAggregatedMapper.query(key, blocksToNext)
    const nextPriceItem = nextPriceList[nextPriceList.length - 1]
    const nextPrice = nextPriceItem.aggregated.amount
    const activePriceList = await this.oraclePriceAggregatedMapper.query(key, 120, nextPriceItem.sort)
    const activePrice = activePriceList[activePriceList.length - 1].aggregated.amount

    return {
      id: priceTicker.id,
      sort: priceTicker.sort,
      nextPrice: nextPrice,
      activePrice: activePrice
    }
  }

  @Get('/:key/feed')
  async getFeed (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceAggregated>> {
    const items = await this.oraclePriceAggregatedMapper.query(key, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  @Get('/:key/oracles')
  async listPriceOracles (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PriceOracle>> {
    const items: PriceOracle[] = await this.oracleTokenCurrencyMapper.query(key, query.size, query.next)

    // TODO(fuxingloh): need to index PriceOracle, this is not performant due to random read
    for (const item of items) {
      const feeds = await this.priceFeedMapper.query(`${key}-${item.oracleId}`, 1)
      item.feed = feeds.length > 0 ? feeds[0] : undefined
    }

    return ApiPagedResponse.of(items, query.size, item => {
      return item.oracleId
    })
  }
}
