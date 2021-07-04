import { Controller, Get, Param } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceFeed } from '@whale-api-client/api/oracle'

@Controller('/v0/:network/oracle/:id')
export class OracleStatusController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly priceFeedMapper: OraclePriceFeedMapper
  ) {
  }

  @Get('/')
  async getAll (
  ): Promise<OraclePriceFeed[] | undefined> {
    return await this.priceFeedMapper.getAll()
  }

  @Get('/priceFeed')
  async getPriceFeedById (
    @Param('id') id: string
  ): Promise<OraclePriceFeed[] | undefined> {
    return await this.priceFeedMapper.getByOracleId(id)
  }
}
