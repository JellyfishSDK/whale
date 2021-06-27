import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceMapping: ModelMapping<OraclePrice> = {
  type: 'token_currency',
  index: {
    token_currency_timestamp: {
      name: 'token_currency_timestamp',
      partition: {
        type: 'string',
        key: (d: OraclePrice) => d.data.timestamp.toString()
      }
      // sort: {
      //   type: 'string',
      //   key: (d: OraclePrice) => d.data.timestamp.toString()
      // }
    }
  }
}

@Injectable()
export class OraclePriceMapper {
  public constructor (protected readonly database: Database) {
  }

  async getActive (timestamp: number): Promise<OraclePrice[] | undefined> {
    return await this.database.query(OraclePriceMapping.index.token_currency_timestamp, {
      order: SortOrder.ASC,
      gte: (timestamp - 3600).toString(),
      lt: (timestamp + 3600).toString(),
      limit: 100
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
