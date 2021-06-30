import { Controller, Get, Param } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { OracleStatus, OracleStatusMapper } from '@src/module.model/oracle.status'

@Controller('/v0/:network/oracle/:oracleid')
export class OracleStatusController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly statusMapper: OracleStatusMapper
  ) {
  }

  @Get('/aggregation')
  async getAggregation (
    @Param('oracleid') oracleid: string
  ): Promise<OracleStatus | undefined> {
    return await this.statusMapper.getLatest(oracleid)
  }
}
