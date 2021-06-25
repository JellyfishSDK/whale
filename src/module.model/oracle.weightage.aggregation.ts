import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database } from '@src/module.database/database'

const OracleWeightageAggregrationMapping: ModelMapping<OracleWeightageAggregation> = {
  type: 'oracle_weightage_aggregation',
  index: {
    hid_height: {
      name: 'oracle_weightage_aggregation_hid_height',
      partition: {
        type: 'string',
        key: (d: OracleWeightageAggregation) => `${d.data.oracleid}-${d.block.height.toString()}`
      },
      sort: {
        type: 'number',
        key: (d: OracleWeightageAggregation) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleWeightageAggregationMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (oracleid: string, height: number): Promise<OracleWeightageAggregation | undefined> {
    return await this.database.get(OracleWeightageAggregrationMapping, `${oracleid}-${height.toString()}`)
  }

  async put (aggregation: OracleWeightageAggregation): Promise<void> {
    return await this.database.put(OracleWeightageAggregrationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleWeightageAggregrationMapping, id)
  }
}

export interface OracleWeightageAggregation extends Model {
  id: string // ------------------| unique id of this output: block height + hid
  hid: string // -----------------| hashed id, for length compatibility reasons this is the hashed id of script

  block: {
    hash: string // --------------| block hash of this script aggregation
    height: number // ------------| block height of this script aggregation
  }

  script: {
    type: string // --------------| known type of the script
    hex: string // ---------------| script in encoded in hex
  }

  data: {
    oracleid: string
    weightage: number
  }
}
