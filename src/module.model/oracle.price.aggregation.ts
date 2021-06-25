import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const OraclePriceAggregrationMapping: ModelMapping<OraclePriceAggregation> = {
  type: 'oracle_price_aggregation',
  index: {
    hid_height: {
      name: 'oracle_price_aggregation_hid_height',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregation) => `${d.data.token}-${d.data.currency}-${d.block.height.toString()}`
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceAggregation) => d.block.height
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregationMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (token: string, currency: string, height: number): Promise<OraclePriceAggregation | undefined> {
    return await this.database.get(OraclePriceAggregrationMapping, `${token}-${currency}-${height.toString()}`)
  }

  async put (aggregation: OraclePriceAggregation): Promise<void> {
    return await this.database.put(OraclePriceAggregrationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregrationMapping, id)
  }
}

export interface OraclePriceAggregation extends Model {
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
    token: string
    currency: string
    amount: BigNumber
    timestamp: BigNumber
  }
}
