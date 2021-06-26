import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database } from '@src/module.database/database'

const OracleWeightageMapping: ModelMapping<OracleWeightage> = {
  type: 'oracle_weightage',
  index: {
    id_height: {
      name: 'oracle_weightage_id_height',
      partition: {
        type: 'string',
        key: (d: OracleWeightage) => d.id
      },
      sort: {
        type: 'number',
        key: (d: OracleWeightage) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleWeightageMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (id: string): Promise<OracleWeightage | undefined> {
    return await this.database.get(OracleWeightageMapping, id)
  }

  async put (aggregation: OracleWeightage): Promise<void> {
    return await this.database.put(OracleWeightageMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleWeightageMapping, id)
  }
}

export interface OracleWeightage extends Model {
  id: string // oracleid
  block: {
    height: number
  }
  data: {
    weightage: number
  }
}
