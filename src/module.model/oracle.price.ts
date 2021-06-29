import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceMapping: ModelMapping<OraclePrice> = {
  type: 'Partition',
  index: {
    id: {
      name: 'oracle_id',
      partition: {
        type: 'string',
        key: (d: OraclePrice) => d.id // oracleId-token-currency
      }
    },
    id_timestamp: {
      name: 'oracle_id_timestamp',
      partition: {
        type: 'string',
        key: (d: OraclePrice) => d.data.tokenCurrency
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

  async getAll (): Promise<OraclePrice[] | undefined> {
    return await this.database.query(OraclePriceMapping.index.id, {
      order: SortOrder.ASC
    })
  }

  async getActivePrice (id: string, timestamp: number): Promise<OraclePrice[] | undefined> {
    console.log(timestamp)
    return await this.database.query(OraclePriceMapping.index.id_timestamp, {
      partitionKey: id,
      order: SortOrder.ASC,
      gte: timestamp - 3600,
      lte: timestamp + 3600,
      limit: 1000
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
  id: string // token-currency
  block: {
    height: number
  }
  data: {
    timestamp: number
    tokenCurrency: string
    token: string
    currency: string
    oracleid: string
    amount: number
  }
}
