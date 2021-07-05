import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleStatus } from '@whale-api-client/api/oracle'

const OracleStatusMapping: ModelMapping<OracleStatus> = {
  type: 'oracle_status',
  index: {
    oracleId_height: {
      name: 'oracle_status_oracleId_height',
      partition: {
        type: 'string',
        key: (d: OracleStatus) => d.data.oracleId
      },
      sort: {
        type: 'number',
        key: (d: OracleStatus) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleStatusMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (oracleId: string): Promise<OracleStatus | undefined> {
    const data = await this.database.query(OracleStatusMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.DESC,
      limit: 1
    })
    return data.length === 0 ? undefined : data[0]
  }

  async get (oracleId: string, height: number): Promise<OracleStatus | undefined> {
    return await this.database.get(OracleStatusMapping, `${oracleId}-${height}`)
  }

  async put (status: OracleStatus): Promise<void> {
    return await this.database.put(OracleStatusMapping, status)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleStatusMapping, id)
  }
}
