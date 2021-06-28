import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceMapping: ModelMapping<OraclePrice> = {
  type: 'Partition',
  index: {
    id: {
      name: 'id',
      partition: {
        type: 'string',
        key: (d: OraclePrice) => d.id
      }
    },
    oracle_token_currency_timestamp: {
      name: 'oracle_token_currency_timestamp',
      partition: {
        type: 'string',
        key: (d: OraclePrice) => d.id
      },
      sort: {
        type: 'number',
        key: (d: OraclePrice) => d.data.timestamp
      }
    }
  }
}

@Injectable()
export class OraclePriceMapper {
  public constructor (protected readonly database: Database) {
  }

  async getAllTokenCurrency (): Promise<OraclePrice[] | undefined> {
    return await this.database.query(OraclePriceMapping.index.id, {
      order: SortOrder.ASC
    })
  }

  async getActivePrice (id: string, timestamp: number): Promise<OraclePrice[] | undefined> {
    return await this.database.query(OraclePriceMapping.index.token_timestamp, {
      partitionKey: id,
      order: SortOrder.ASC,
      gt: timestamp - 3600,
      lt: timestamp + 3600
    })
  }

  async get (id: string): Promise<OraclePrice | undefined> {
    return await this.database.get(OraclePriceMapping, id)
  }

  async put (aggregation: OraclePrice): Promise<void> {
    return await this.database.put(OraclePriceMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceMapping, id)
  }
}

export interface OraclePrice extends Model {
  id: string // oracleid-token-currency
  block: {
    height: number
  }
  data: {
    timestamp: number
    oracleid: string
    token: string
    currency: string
    amount: number
  }
}
