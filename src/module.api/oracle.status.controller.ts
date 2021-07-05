import { Controller, Get, Param } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OracleAppointed } from '@whale-api-client/api/oracle'

@Controller('/v0/:network/oracle/:id')
export class OracleStatusController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly statusMapper: OracleAppointedMapper
  ) {
  }

  @Get('/status')
  async getStatus (
    @Param('id') id: string
  ): Promise<OracleAppointed | undefined> {
    return await this.statusMapper.getLatest(id)
  }
}
