import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OraclePriceData } from '@whale-api-client/api/oracle'

const OraclePriceDataMapping: ModelMapping<OraclePriceData> = {
  type: 'oracle_price_data',
  index: {
    oracleId_tokenCurrencyAmountHeight: {
      name: 'oracle_price_data_oracleId-tokenCurrencyAmountHeight',
      partition: {
        type: 'string',
        key: (d: OraclePriceData) => d.data.oracleId
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceData) => `${d.data.token}-${d.data.currency}-${d.data.amount}-${d.block.height}`
      }
    },
    oracleIdTokenCurrency_amountHeight: {
      name: 'oracle_price_data_oracleIdTokenCurrency-amountHeight',
      partition: {
        type: 'string',
        key: (d: OraclePriceData) => `${d.data.oracleId}-${d.data.token}-${d.data.currency}`
      },
      sort: {
        type: 'string',
        key: (d: OraclePriceData) => `${d.data.amount}-${d.block.height}`
      }
    },
    tokenCurrency_timestamp: {
      name: 'oracle_price_data_tokenCurrency-timestamp',
      partition: {
        type: 'string',
        key: (d: OraclePriceData) => `${d.data.token}-${d.data.currency}`
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

  async getByOracleId (oracleId: string): Promise<OraclePriceData[] | undefined> {
    return await this.database.query(OraclePriceDataMapping.index.oracleId_tokenCurrencyAmountHeight, {
      partitionKey: oracleId,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getByOracleIdTokenCurrency (oracleId: string, token: string, currency: string): Promise<OraclePriceData[] | undefined> {
    return await this.database.query(OraclePriceDataMapping.index.oracleIdTokenCurrency_amountHeight, {
      partitionKey: `${oracleId}-${token}-${currency}`,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getActivePrices (token: string, currency: string, timestamp: number): Promise<OraclePriceData[] | undefined> {
    return await this.database.query(OraclePriceDataMapping.index.tokenCurrency_timestamp, {
      partitionKey: `${token}-${currency}`,
      order: SortOrder.ASC,
      gte: timestamp - 3600,
      lte: timestamp + 3600,
      limit: 1000000
    })
  }

  async get (oracleId: string, token: string, currency: string, height: number, timestamp: number): Promise<OraclePriceData | undefined> {
    return await this.database.get(OraclePriceDataMapping, `${oracleId}-${token}-${currency}-${height}-${timestamp}`)
  }

  async put (priceData: OraclePriceData): Promise<void> {
    return await this.database.put(OraclePriceDataMapping, priceData)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceDataMapping, id)
  }
}
