import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database } from '@src/module.database/database'

const OraclePriceAggregationMapping: ModelMapping<OraclePriceAggregration> = {
  type: 'oracle_price_aggregration',
  index: {
    id_height: {
      name: 'oracle_price_id_aggregration',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregration) => d.id
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceAggregration) => d.block.height
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregrationMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (id: string): Promise<OraclePriceAggregration | undefined> {
    return await this.database.get(OraclePriceAggregationMapping, id)
  }

  async put (aggregation: OraclePriceAggregration): Promise<void> {
    return await this.database.put(OraclePriceAggregationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregationMapping, id)
  }
}

export interface OraclePriceAggregration extends Model {
  id: string // token-currency
  block: {
    height: number // ------------| block height of this script aggregation
  }
  data: {
    amount: number
    timestamp: number
  }
}
