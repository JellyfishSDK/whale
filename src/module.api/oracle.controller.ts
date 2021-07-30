import { Controller, Get, Param, Query } from '@nestjs/common'
import { Oracle, OracleMapper } from '@src/module.model/oracle'
import { OraclePriceFeed, OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { OracleTokenCurrency, OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

@Controller()
export class OracleController {
  constructor (
    protected readonly oracleMapper: OracleMapper,
    protected readonly oraclePriceAggregatedMapper: OraclePriceAggregatedMapper,
    protected readonly oraclePriceFeedMapper: OraclePriceFeedMapper,
    protected readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper
  ) {
  }

  @Get('/oracles')
  async listOracle (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<Oracle>> {
    const items = await this.oracleMapper.query(query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.id
    })
  }

  @Get('/oracles/:oracleId/:key/prices')
  async listOraclePrices (
    @Param('oracleId') oracleId: string,
      @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceFeed>> {
    const items = await this.oraclePriceFeedMapper.query(`${key}-${oracleId}`, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  // TODO(fuxingloh): more endpoint

  @Get('/prices/:key/aggregated')
  async listPriceAggregated (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceAggregated>> {
    const items = await this.oraclePriceAggregatedMapper.query(key, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  @Get('/prices/:key/oracles')
  async listPriceOracles (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OracleTokenCurrency>> {
    const items = await this.oracleTokenCurrencyMapper.query(key, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.oracleId
    })
  }
}
