import { Controller, Get, Param } from '@nestjs/common'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import {
  OracleAppointed,
  OraclePriceAggregration,
  OraclePriceData,
  OraclePriceFeed
} from '@whale-api-client/api/oracle'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import BigNumber from 'bignumber.js'

@Controller('/v0/:network/oracle')
export class OracleController {
  constructor (
    protected readonly appointedMapper: OracleAppointedMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper,
    protected readonly priceDataMapper: OraclePriceDataMapper,
    protected readonly priceAggregrationMapper: OraclePriceAggregrationMapper
  ) {
  }

  @Get('/:id/status')
  async getStatus (
    @Param('id') id: string
  ): Promise<OracleAppointed | undefined> {
    return await this.appointedMapper.getLatest(id)
  }

  @Get('/priceFeeds')
  async getPriceFeeds (): Promise<OraclePriceFeed[] | undefined> {
    return await this.priceFeedMapper.getPriceFeeds()
  }

  @Get('/:id/priceFeed')
  async getPriceFeed (
    @Param('id') id: string
  ): Promise<OraclePriceFeed[] | undefined> {
    return await this.priceFeedMapper.getByOracleId(id)
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
}
