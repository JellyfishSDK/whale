import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleStatus } from '@src/module.indexer/model/oracle.weightage.priceFeed'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle_priceFeed',
  index: {
    id: {
      name: 'oracle_priceFeed_id',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.id // oracleId-token-currency
      }
    },
    id_token_currency: {
      name: 'oracle_priceFeed_token_currency',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.id
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceFeed) => `${d.data.token}-${d.data.currency}`
      }
    },
    id_oracleId: {
      name: 'oracle_priceFeed_id_oracleId',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.id
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.data.oracleId
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
      limit: 1000000,
      order: SortOrder.ASC
    })
  }

  async getByTokenCurrency (token: string, currency: string): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.token_currency, {
      partitionKey: `${token}-${currency}`,
      limit: 1000000,
      order: SortOrder.ASC
    })
  }

  async getByOracleId (id: string, oracleId: string): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.id_oracleId, {
      partitionKey: id,
      limit: 1000000,
      order: SortOrder.ASC,
      gte: oracleId,
      lte: oracleId
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
  id: string // token-currency
  block: {
    height: number
  }
  data: {
    oracleId: string
    token: string
    currency: string
  }
  state: OracleStatus
}
