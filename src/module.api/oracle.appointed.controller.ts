import { Controller, Get, Param } from '@nestjs/common'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OracleAppointed } from '@whale-api-client/api/oracle'

@Controller('/v0/:network/oracle')
export class OracleAppointedController {
  constructor (
    protected readonly appointedMapper: OracleAppointedMapper
  ) {
  }

  @Get('/:id/status')
  async getStatus (
    @Param('id') id: string
  ): Promise<OracleAppointed | undefined> {
    return await this.appointedMapper.getLatest(id)
  }
}
