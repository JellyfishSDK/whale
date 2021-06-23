import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { HexEncoder } from '@src/module.model/_hex.encoder'

const OraclePriceAggregrationMapping: ModelMapping<OraclePriceAggregation> = {
  type: 'oracle_price_aggregation',
  index: {
    hid_height: {
      name: 'oracle_price_aggregation_hid_height',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregation) => d.hid
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

  async getLatest (hid: string): Promise<OraclePriceAggregation | undefined> {
    const aggregations = await this.database.query(OraclePriceAggregrationMapping.index.hid_height, {
      partitionKey: hid,
      order: SortOrder.DESC,
      limit: 1
    })
    return aggregations.length === 0 ? undefined : aggregations[0]
  }

  async query (hid: string, limit: number, lt?: number): Promise<OraclePriceAggregation[]> {
    return await this.database.query(OraclePriceAggregrationMapping.index.hid_height, {
      partitionKey: hid,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (hid: string, height: number): Promise<OraclePriceAggregation | undefined> {
    return await this.database.get(OraclePriceAggregrationMapping, HexEncoder.encodeHeight(height) + hid)
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
    timestamp: number
  }
}
