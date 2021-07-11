import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleAppointed } from '@whale-api-client/api/oracle'

const OracleAppointedMapping: ModelMapping<OracleAppointed> = {
  type: 'oracle_appointed',
  index: {
    oracleId_height: {
      name: 'oracle_appointed_oracleId_height',
      partition: {
        type: 'string',
        key: (d: OracleAppointed) => d.data.oracleId
      },
      sort: {
        type: 'number',
        key: (d: OracleAppointed) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleAppointedMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (oracleId: string): Promise<OracleAppointed | undefined> {
    const data = await this.database.query(OracleAppointedMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.DESC,
      limit: 1
    })
    return data.length === 0 ? undefined : data[0]
  }

  async get (oracleId: string, height: number): Promise<OracleAppointed | undefined> {
    return await this.database.get(OracleAppointedMapping, `${oracleId}-${height}`)
  }

  async put (status: OracleAppointed): Promise<void> {
    return await this.database.put(OracleAppointedMapping, status)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleAppointedMapping, id)
  }
}
