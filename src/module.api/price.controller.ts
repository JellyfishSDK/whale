import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PriceTicker, PriceTickerMapper } from '@src/module.model/price.ticker'
import { PriceOracle } from '@whale-api-client/api/prices'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OracleIntervalSeconds, OraclePriceAggregatedInterval10MinuteMapper, OraclePriceAggregatedInterval1DayMapper, OraclePriceAggregatedInterval1HourMapper, OraclePriceAggregatedInterval5MinuteMapper, OraclePriceAggregatedIntervalMapper } from '@src/module.model/oracle.price.aggregated.interval'

@Controller('/prices')
export class PriceController {
  protected readonly intervalMappers: Record<number, OraclePriceAggregatedIntervalMapper>

  constructor (
    protected readonly oraclePriceAggregatedMapper: OraclePriceAggregatedMapper,
    protected readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper,
    oraclePriceAggregatedInterval5MinuteMapper: OraclePriceAggregatedInterval5MinuteMapper,
    oraclePriceAggregatedInterval10MinuteMapper: OraclePriceAggregatedInterval10MinuteMapper,
    oraclePriceAggregatedInterval1HourMapper: OraclePriceAggregatedInterval1HourMapper,
    oraclePriceAggregatedInterval1DayMapper: OraclePriceAggregatedInterval1DayMapper
  ) {
    this.intervalMappers = {
      [OracleIntervalSeconds.FIVE_MINUTES]: oraclePriceAggregatedInterval5MinuteMapper,
      [OracleIntervalSeconds.TEN_MINUTES]: oraclePriceAggregatedInterval10MinuteMapper,
      [OracleIntervalSeconds.ONE_HOUR]: oraclePriceAggregatedInterval1HourMapper,
      [OracleIntervalSeconds.ONE_DAY]: oraclePriceAggregatedInterval1DayMapper
    }
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

  @Get('/:key/:interval/feed')
  async getFeedWithInterval (
    @Param('key') key: string,
      @Param('interval') interval: number,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceAggregated>> {
    const intervalMapper = this.intervalMappers[interval]
    if (intervalMapper === undefined) {
      throw new BadRequestException('Specified interval does not exist')
    }

    const items = await intervalMapper.query(key, query.size, query.next)
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
