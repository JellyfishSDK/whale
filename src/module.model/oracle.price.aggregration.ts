import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database } from '@src/module.database/database'

const OraclePriceAggregrationMapping: ModelMapping<OraclePriceAggregration> = {
  type: 'oracle_price_aggregration',
  index: {
    token_currency_timestamp: {
      name: 'oracle_token_currency_timestamp',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregration) => d.data.token + '-' + d.data.currency
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceAggregration) => d.data.timestamp
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregrationMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (id: string): Promise<OraclePriceAggregration | undefined> {
    return await this.database.get(OraclePriceAggregrationMapping, id)
  }

  async put (aggregation: OraclePriceAggregration): Promise<void> {
    return await this.database.put(OraclePriceAggregrationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregrationMapping, id)
  }
}

export interface OraclePriceAggregration extends Model {
  id: string
  block: {
    height: number
  }
  data: {
    timestamp: number
    token: string
    currency: string
    amount: number
  }
}
