import { Controller, Get, Param, Query } from '@nestjs/common'
import {
  OracleAppointedTokenCurrency,
  OraclePriceData,
  OraclePriceAggregration,
  OracleTokenCurrency,
  OraclePriceInterval
} from '@whale-api-client/api/oracle'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import BigNumber from 'bignumber.js'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { BadRequestApiException } from '@src/module.api/_core/api.error'

@Controller('/v0/:network/oracle')
export class OracleController {
  constructor (
    protected readonly appointedTokenCurrencyMapper: OracleAppointedTokenCurrencyMapper,
    protected readonly priceDataMapper: OraclePriceDataMapper,
    protected readonly priceAggregrationMapper: OraclePriceAggregrationMapper
  ) {
  }

  @Get('/token/currency')
  async listTokenCurrencies (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OracleTokenCurrency>> {
    const list = (await this.appointedTokenCurrencyMapper.list() ?? [])
      .map((obj: OracleAppointedTokenCurrency) => {
        return {
          token: obj.data.token,
          currency: obj.data.currency,
          state: obj.state
        }
      })
      .sort((a, b) =>
        `${a.token}-${a.currency}`.localeCompare(`${b.token}-${b.currency}`))

    const sliceList = this.getSliceList(list, query, list.findIndex(l => `${l.token}-${l.currency}` === query.next))

    return ApiPagedResponse.of(sliceList, query.size, item => {
      return `${item.token}-${item.currency}`
    })
  }

  @Get('/:id/token/currency')
  async getTokenCurrencies (
    @Param('id') id: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OracleTokenCurrency>> {
    const list = (await this.appointedTokenCurrencyMapper.getByOracleId(id) ?? [])
      .map((obj: OracleAppointedTokenCurrency) => {
        return {
          token: obj.data.token,
          currency: obj.data.currency,
          state: obj.state
        }
      })
      .sort((a, b) =>
        `${a.token}-${a.currency}`.localeCompare(`${b.token}-${b.currency}`))

    const sliceList = this.getSliceList(list, query, list.findIndex(l => `${l.token}-${l.currency}` === query.next))

    return ApiPagedResponse.of(sliceList, query.size, item => {
      return `${item.token}-${item.currency}`
    })
  }

  @Get('/:id/price/data')
  async getPriceData (
    @Param('id') id: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceData>> {
    const list = (await this.priceDataMapper.getByOracleId(id) ?? [])
      .sort((a, b) =>
        `${a.data.token}-${a.data.currency}`.localeCompare(`${b.data.token}-${b.data.currency}`))

    const sliceList = this.getSliceList(list, query, list.findIndex(l => `${l.data.token}-${l.data.currency}` === query.next))

    return ApiPagedResponse.of(sliceList, query.size, item => {
      return `${item.data.token}-${item.data.currency}`
    })
  }

  @Get('/:token/:currency/price')
  async getPrice (
    @Param('token') token: string,
      @Param('currency') currency: string
  ): Promise<OraclePriceAggregration | undefined> {
    return await this.priceAggregrationMapper.getLatestByTokenCurrency(token, currency)
  }

  @Get('/:token/:currency/:timestamp/price')
  async getPriceByTimestamp (
    @Param('token') token: string,
      @Param('currency') currency: string,
      @Param('timestamp') timestamp: number
  ): Promise<OraclePriceAggregration | undefined> {
    return await this.priceAggregrationMapper.getLatestByTokenCurrencyBlockTime(token, currency, timestamp)
  }

  @Get('/:token/:currency/:timestamp1/:timestamp2/:timeInterval/price/interval')
  async getIntervalPrice (
    @Param('token') token: string,
      @Param('currency') currency: string,
      @Param('timestamp1') timestamp1: number,
      @Param('timestamp2') timestamp2: number,
      @Param('timeInterval') timeInterval: number,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceInterval>> {
    if (timestamp1 < 0 || timestamp1 > 9999999999 || timestamp2 < 0 || timestamp2 > 9999999999) {
      throw new BadRequestApiException('Timestamp is out of range')
    }

    const timestampDifference = Math.abs(timestamp2 - timestamp1)

    const allPrices = []

    const no = Math.abs(timestampDifference) / timeInterval

    for (let i = 0; i <= no; i += 1) {
      const timestamp = timestamp1 + timeInterval * i
      const result = await this.priceAggregrationMapper.getLatestByTokenCurrencyBlockTime(token, currency, timestamp)
      const data = { timestamp, amount: new BigNumber(result?.data?.amount.toString() ?? '0') }
      allPrices.push(data)
    }

    const list = allPrices.sort(a => a.timestamp)
    const sliceList = this.getSliceList(list, query, list.findIndex(l => l.timestamp === Number.parseInt(query.next ?? '0')))

    return ApiPagedResponse.of(sliceList, query.size, item => {
      return item.timestamp.toString()
    })
  }

  getSliceList<T> (list: T[], query: PaginationQuery, index: number): T[] {
    let sliceList: T[] = []

    if (query.next !== undefined) {
      if (index >= 0) {
        sliceList = list.slice(index + 1, index + 1 + query.size)
      }
    } else {
      sliceList = list.slice(0, query.size)
    }

    return sliceList
  }
}
