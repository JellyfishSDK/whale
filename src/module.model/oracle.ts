import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OracleMapping: ModelMapping<Oracle> = {
  type: 'oracle',
  index: {
    id: {
      name: 'oracle_id',
      partition: {
        type: 'string',
        key: (b: Oracle) => b.id
      }
    }
  }
}

@Injectable()
export class OracleMapper {
  public constructor (protected readonly database: Database) {
  }

  async getById (id: string): Promise<Oracle | undefined> {
    return await this.database.get(OracleMapping.index.id, id)
  }

  async getByStatus (status: number): Promise<Oracle[] | undefined> {
    const oracles = await this.database.query(OracleMapping.index.id, {
      order: SortOrder.DESC,
      limit: 3
    })

    return oracles.filter(o => o.status === status)
  }

  async put (oracle: Oracle): Promise<void> {
    return await this.database.put(OracleMapping, oracle)
  }

  async delete (oracleid: string): Promise<void> {
    return await this.database.delete(OracleMapping, oracleid)
  }
}

export interface Oracle extends Model {
  id: string
  status: number
}
