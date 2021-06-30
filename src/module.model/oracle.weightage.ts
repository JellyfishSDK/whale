import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleStatus } from '@src/module.indexer/model/oracle.weightage.priceFeed'

const OracleWeightageMapping: ModelMapping<OracleWeightage> = {
  type: 'oracle_weightage',
  index: {
    id_height: {
      name: 'oracle_weightage_id_height',
      partition: {
        type: 'string',
        key: (d: OracleWeightage) => d.id // oracleid
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

  async getLatest (id: string): Promise<OracleWeightage | undefined> {
    const aggregations = await this.database.query(OracleWeightageMapping.index.id_height, {
      partitionKey: id,
      order: SortOrder.DESC,
      limit: 1
    })
    return aggregations.length === 0 ? undefined : aggregations[0]
  }

  async get (id: string): Promise<OracleWeightage | undefined> {
    return await this.database.get(OracleWeightageMapping, id)
  }

  async put (id: OracleWeightage): Promise<void> {
    return await this.database.put(OracleWeightageMapping, id)
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
  state: OracleStatus
}
