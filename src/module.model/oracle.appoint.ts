import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleAppoint } from '@whale-api-client/api/oracle'

const OracleAppointMapping: ModelMapping<OracleAppoint> = {
  type: 'oracle_status',
  index: {
    oracleId_height: {
      name: 'oracle_status_oracleId_height',
      partition: {
        type: 'string',
        key: (d: OracleAppoint) => d.data.oracleId
      },
      sort: {
        type: 'number',
        key: (d: OracleAppoint) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleAppointMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (oracleId: string): Promise<OracleAppoint | undefined> {
    const data = await this.database.query(OracleAppointMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.DESC,
      limit: 1
    })
    return data.length === 0 ? undefined : data[0]
  }

  async get (oracleId: string, height: number): Promise<OracleAppoint | undefined> {
    return await this.database.get(OracleAppointMapping, `${oracleId}-${height}`)
  }

  async put (status: OracleAppoint): Promise<void> {
    return await this.database.put(OracleAppointMapping, status)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleAppointMapping, id)
  }
}
