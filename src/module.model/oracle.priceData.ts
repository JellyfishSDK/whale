import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceDataMapping: ModelMapping<OraclePriceData> = {
  type: 'oracle_price_data',
  index: {
    id_height: {
      name: 'oracle_price_data',
      partition: {
        type: 'string',
        key: (d: OraclePriceData) => d.id
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceData) => d.block.height
      }
    },
    token_currency_timestamp: {
      name: 'oracle_price_token_currency_timestamp',
      partition: {
        type: 'string',
        key: (d: OraclePriceData) => d.data.token + '-' + d.data.currency
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceData) => d.data.timestamp
      }
    }
  }
}

@Injectable()
export class OraclePriceDataMapper {
  public constructor (protected readonly database: Database) {
  }

  async getActivePrices (token: string, currency: string, timestamp: number): Promise<OraclePriceData[] | undefined> {
    return await this.database.query(OraclePriceDataMapping.index.token_currency_timestamp, {
      partitionKey: `${token}-${currency}`,
      order: SortOrder.ASC,
      gte: timestamp - 300,
      lte: timestamp,
      limit: 1000000
    })
  }

  async get (id: string): Promise<OraclePriceData | undefined> {
    return await this.database.get(OraclePriceDataMapping, id)
  }

  async put (id: OraclePriceData): Promise<void> {
    return await this.database.put(OraclePriceDataMapping, id)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceDataMapping, id)
  }
}

export interface OraclePriceData extends Model {
  id: string
  block: {
    height: number
  }
  data: {
    timestamp: number
    token: string
    currency: string
    oracleId: string
    amount: number
  }
}
