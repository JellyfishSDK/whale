import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle_price_feed',
  index: {
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
    },
    token_currency: {
      name: 'oracle_price_feed_token_currency',
      partition: {
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

  async getByTokenCurrency (): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.token_currency, {
      limit: 1000000,
      order: SortOrder.ASC
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
