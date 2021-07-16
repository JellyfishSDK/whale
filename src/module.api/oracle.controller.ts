import { Controller, Get, Param, Query } from '@nestjs/common'
import {
  OracleAppointedTokenCurrency,
  OraclePriceData,
  OraclePriceAggregration,
  TokenCurrency,
  PriceInterval
} from '@whale-api-client/api/oracle'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import BigNumber from 'bignumber.js'
import { BadRequestApiException } from '@src/module.api/_core/api.error'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'

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
  ): Promise<ApiPagedResponse<TokenCurrency>> {
    const list: TokenCurrency[] = (await this.appointedTokenCurrencyMapper.list() ?? [])
      .map((obj: OracleAppointedTokenCurrency) => {
        return {
          token: obj.data.token,
          currency: obj.data.currency,
          state: obj.state
        }
      })
      .sort((a, b) =>
        `${a.token}-${a.currency}`.localeCompare(`${b.token}-${b.currency}`))

    let sliceList: TokenCurrency[] = []

    if (query.next !== undefined) {
      const index = list.findIndex(l => `${l.token}-${l.currency}` === query.next)
      if (index >= 0) {
        sliceList = list.slice(index + 1, index + 1 + query.size)
      }
    } else {
      sliceList = list.slice(0, query.size)
    }

    return ApiPagedResponse.of(sliceList, query.size, item => {
      return `${item.token}-${item.currency}`
    })
  }

  @Get('/:id/token/currency')
  async getTokenCurrencies (
    @Param('id') id: string
  ): Promise<OracleAppointedTokenCurrency[] | undefined> {
    return await this.appointedTokenCurrencyMapper.getByOracleId(id)
  }

  @Get('/:id/price/data')
  async getPriceData (
    @Param('id') id: string
  ): Promise<OraclePriceData[] | undefined> {
    return await this.priceDataMapper.getByOracleId(id)
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
      @Param('timeInterval') timeInterval: number
  ): Promise<PriceInterval[]> {
    if ((timestamp1 < 0 && timestamp1 > 9999999999) || (timestamp2 < 0 && timestamp2 > 9999999999)) {
      throw new BadRequestApiException('Timestamp is out of range')
    }

    const timestampDifference = Math.abs(timestamp2 - timestamp1)

    const allPrices = []

    const no = Math.abs(timestampDifference) / timeInterval

    for (let i = 0; i <= no; i += 1) {
      const timestamp = timestamp1 + timeInterval * i
      const result = await this.priceAggregrationMapper.getLatestByTokenCurrencyBlockTime(token, currency, timestamp)
      const data = { timestamp, amount: new BigNumber(result?.data?.amount ?? 0) }
      allPrices.push(data)
    }

    return allPrices
  }
}
