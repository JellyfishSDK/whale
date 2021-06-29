import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle_priceFeed',
  index: {
    id: {
      name: 'oracle_priceFeed_id',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.id // oracleId-token-currency
      }
    }
  }
}

@Injectable()
export class OraclePriceFeedMapper {
  public constructor (protected readonly database: Database) {
  }

  async getAll (): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.id, {
      order: SortOrder.ASC
    })
  }

  async get (id: string): Promise<OraclePriceFeed | undefined> {
    return await this.database.get(OraclePriceFeedMapping, id)
  }

  async put (aggregation: OraclePriceFeed): Promise<void> {
    return await this.database.put(OraclePriceFeedMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceFeedMapping, id)
  }
}

export interface OraclePriceFeed extends Model {
  id: string // oracleid-token-currency-height
  data: {
    token: string
    currency: string
  }
}
