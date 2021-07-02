import { Controller, Get, Param } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { OracleStatusMapper } from '@src/module.model/oracle.status'
import { OracleStatus } from '@whale-api-client/api/oracle'

@Controller('/v0/:network/oracle/:id')
export class OracleStatusController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly statusMapper: OracleStatusMapper
  ) {
  }

  @Get('/status')
  async getStatus (
    @Param('id') id: string
  ): Promise<OracleStatus | undefined> {
    return await this.statusMapper.getLatest(id)
  }
}
