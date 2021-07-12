import { Controller, Get, Param } from '@nestjs/common'
import {
  OraclePriceAggregration,
  OraclePriceData,
  OracleAppointedTokenCurrency
} from '@whale-api-client/api/oracle'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import BigNumber from 'bignumber.js'

@Controller('/v0/:network/oracle')
export class OracleController {
  constructor (
    protected readonly priceFeedMapper: OracleAppointedTokenCurrencyMapper,
    protected readonly priceDataMapper: OraclePriceDataMapper,
    protected readonly priceAggregrationMapper: OraclePriceAggregrationMapper
  ) {
  }

  @Get('/priceFeeds')
  async getPriceFeeds (): Promise<OracleAppointedTokenCurrency[] | undefined> {
    return await this.priceFeedMapper.list()
  }

  @Get('/:id/priceFeed')
  async getPriceFeed (
    @Param('id') id: string
  ): Promise<OracleAppointedTokenCurrency[] | undefined> {
    return await this.priceFeedMapper.listByOracleId(id)
  }

  @Get('/:id/priceData')
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
    return await this.priceAggregrationMapper.getLatest(token, currency)
  }

  @Get('/:token/:currency/:timestamp/price')
  async getPriceByTimestamp (
    @Param('token') token: string,
      @Param('currency') currency: string,
      @Param('timestamp') timestamp: number
  ): Promise<OraclePriceAggregration | undefined> {
    return await this.priceAggregrationMapper.getLatestByTimestamp(token, currency, timestamp)
  }

  @Get('/:token/:currency/:timestamp1/:timestamp2/percentagePriceChange')
  async getPricePercentageChange (
    @Param('token') token: string,
      @Param('currency') currency: string,
      @Param('timestamp1') timestamp1: number,
      @Param('timestamp2') timestamp2: number
  ): Promise<BigNumber> {
    const result1 = await this.priceAggregrationMapper.getLatestByTimestamp(token, currency, timestamp1)
    const result2 = await this.priceAggregrationMapper.getLatestByTimestamp(token, currency, timestamp2)

    const amountBN1 = new BigNumber(result1?.data.amount ?? 0)
    const amountBN2 = new BigNumber(result2?.data.amount ?? 0)

    return (amountBN2.minus(amountBN1)).div(100)
  }

  @Get('/:token/:currency/:timestamp1/:timestamp2/:interval/pricesInterval')
  async getPriceInterval (
    @Param('token') token: string,
      @Param('currency') currency: string,
      @Param('timestamp1') timestamp1: number,
      @Param('timestamp2') timestamp2: number,
      @Param('interval') interval: number
  ): Promise<any> {
    const timestampDifference = timestamp2 - timestamp1

    const allPrices = []

    const no = timestampDifference / interval

    for (let i = 0; i <= no; i += 1) {
      const timestamp = timestamp1 + interval * i
      const result = await this.priceAggregrationMapper.getLatestByTimestamp(token, currency, timestamp)
      const data = { timestamp, amount: result?.data?.amount }
      allPrices.push(data)
    }

    return allPrices
  }
}
