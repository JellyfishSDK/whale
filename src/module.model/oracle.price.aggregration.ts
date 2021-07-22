import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OraclePriceAggregration } from '@whale-api-client/api/oracle'

const OraclePriceAggregrationMapping: ModelMapping<OraclePriceAggregration> = {
  type: 'oracle_price_aggregration',
  index: {
    tokenCurrency_heightBlockTime: {
      name: 'oracle_price_aggregration_tokenCurrency-heightBlockTime',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregration) => `${d.data.token}-${d.data.currency}`
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceAggregration) => `${d.block.height}-${d.block.time}`
      }
    },
    tokenCurrency_blockTime: {
      name: 'oracle_price_aggregration_tokenCurrency-blockTime',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregration) => `${d.data.token}-${d.data.currency}`
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceAggregration) => d.block.time
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregrationMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatestByTokenCurrency (token: string, currency: string): Promise<OraclePriceAggregration | undefined> {
    const data = await this.database.query(OraclePriceAggregrationMapping.index.tokenCurrency_heightBlockTime, {
      partitionKey: `${token}-${currency}`,
      order: SortOrder.DESC,
      limit: 1
    })

    return data.length === 0 ? undefined : data[0]
  }

  async list (token: string, currency: string): Promise<OraclePriceAggregration[] | undefined> {
    return await this.database.query(OraclePriceAggregrationMapping.index.tokenCurrency_heightBlockTime, {
      partitionKey: `${token}-${currency}`,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getLatestByTokenCurrencyBlockTime (token: string, currency: string, blockTime: number): Promise<OraclePriceAggregration | undefined> {
    const data = await this.database.query(OraclePriceAggregrationMapping.index.tokenCurrency_blockTime, {
      partitionKey: `${token}-${currency}`,
      order: SortOrder.DESC,
      gte: blockTime,
      lte: blockTime,
      limit: 1
    })

    return data.length === 0 ? undefined : data[0]
  }

  async get (token: string, currency: string, height: number, timestamp: number): Promise<OraclePriceAggregration | undefined> {
    return await this.database.get(OraclePriceAggregrationMapping, `${token}-${currency}-${height}-${timestamp}`)
  }

  async put (aggregation: OraclePriceAggregration): Promise<void> {
    return await this.database.put(OraclePriceAggregrationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregrationMapping, id)
  }
}
