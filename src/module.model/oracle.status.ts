import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleState } from '@whale-api-client/api/oracle'

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

  async get (id: string): Promise<OracleStatus | undefined> {
    return await this.database.get(OracleStatusMapping, id)
  }

  async put (id: OracleStatus): Promise<void> {
    return await this.database.put(OracleStatusMapping, id)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleStatusMapping, id)
  }
}

export interface OracleStatus extends Model {
  id: string // oracleId - height
  block: {
    height: number
  }
  data: {
    oracleId: string
    weightage: number
  }
  state: OracleState
}
