import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle_price_feed',
  index: {
    id: {
      name: 'oracle_price_feed_id',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.id
      }
    },
    oracleId_token_currency: {
      name: 'oracle_price_feed_oracleid_token_currency',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.data.oracleId
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceFeed) => `${d.data.token}-${d.data.currency}`
      }
    }
  }
}

@Injectable()
export class OraclePriceFeedMapper {
  public constructor (protected readonly database: Database) {
  }

  async getByOracleId (oracleId: string): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.oracleId_token_currency, {
      partitionKey: oracleId,
      limit: 1000000,
      order: SortOrder.ASC
    })
  }

  async getAll (): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.id, {
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async get (id: string): Promise<OraclePriceFeed | undefined> {
    return await this.database.get(OraclePriceFeedMapping, id)
  }

  async put (id: OraclePriceFeed): Promise<void> {
    return await this.database.put(OraclePriceFeedMapping, id)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceFeedMapping, id)
  }
}

export interface OraclePriceFeed extends Model {
  id: string // oracleId-token-currency
  block: {
    height: number
  }
  data: {
    oracleId: string
    token: string
    currency: string
  }
  state: OraclePriceFeedStatus
}

export enum OraclePriceFeedStatus {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
