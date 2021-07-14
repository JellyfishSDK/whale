import { Controller, Get, Param } from '@nestjs/common'
import {
  OracleAppointedTokenCurrency,
  OraclePriceData,
  OraclePriceAggregration,
  PriceInterval
} from '@whale-api-client/api/oracle'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import BigNumber from 'bignumber.js'
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
  async listTokenCurrencies (): Promise<OracleAppointedTokenCurrency[] | undefined> {
    return await this.appointedTokenCurrencyMapper.list()
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

  @Get('/:token/:currency/:timestamp1/:timestamp2/price/change/percentage')
  async getPriceChangePercentage (
    @Param('token') token: string,
      @Param('currency') currency: string,
      @Param('timestamp1') timestamp1: number,
      @Param('timestamp2') timestamp2: number
  ): Promise<BigNumber> {
    if ((timestamp1 < 0 && timestamp1 > 9999999999) || (timestamp2 < 0 && timestamp2 > 9999999999)) {
      throw new BadRequestApiException('Timestamp is out of range')
    }

    const result1 = await this.priceAggregrationMapper.getLatestByTokenCurrencyBlockTime(token, currency, timestamp1)
    const result2 = await this.priceAggregrationMapper.getLatestByTokenCurrencyBlockTime(token, currency, timestamp2)

    const amountBN1 = new BigNumber(result1?.data.amount ?? 0)
    const amountBN2 = new BigNumber(result2?.data.amount ?? 0)

    return (amountBN2.minus(amountBN1)).div(100)
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
