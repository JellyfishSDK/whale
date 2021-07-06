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
  async getAllPriceFeeds (): Promise<OraclePriceFeed[] | undefined> {
    return await this.priceFeedMapper.getAll()
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
}
