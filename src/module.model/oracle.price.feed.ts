import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OraclePriceFeed } from '@whale-api-client/api/oracle'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle_price_feed',
  index: {
    id: {
      name: 'oracle_price_feed_id',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => `${d.block.height}-${d.data.token}-${d.data.currency}-${d.block.height}`
      }
    },
    oracleId_height: {
      name: 'oracle_price_feed_oracleId_height',
      partition: {
        type: 'string',
        key: (d: OraclePriceFeed) => d.data.oracleId
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceFeed) => `${d.data.token}-${d.data.currency}-${d.block.height}`
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
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getByOracleId (oracleId: string): Promise<OraclePriceFeed[] | undefined> {
    return await this.database.query(OraclePriceFeedMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async get (oracleId: string, token: string, currency: string, height: number): Promise<OraclePriceFeed | undefined> {
    return await this.database.get(OraclePriceFeedMapping, `${oracleId}-${token}-${currency}-${height}`)
  }

  async put (priceFeed: OraclePriceFeed): Promise<void> {
    return await this.database.put(OraclePriceFeedMapping, priceFeed)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceFeedMapping, id)
  }
}
