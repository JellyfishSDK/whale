import { Controller, Get, Param } from '@nestjs/common'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OracleAppointed, OraclePriceData, OraclePriceFeed } from '@whale-api-client/api/oracle'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'

@Controller('/v0/:network/oracle')
export class OracleController {
  constructor (
    protected readonly appointedMapper: OracleAppointedMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper,
    protected readonly priceDataMapper: OraclePriceDataMapper
  ) {
  }

  @Get('/:id/status')
  async getStatus (
    @Param('id') id: string
  ): Promise<OracleAppointed | undefined> {
    return await this.appointedMapper.getLatest(id)
  }

  @Get('/priceFeeds')
  async getAllPriceFeeds (
  ): Promise<OraclePriceFeed[] | undefined> {
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
}
