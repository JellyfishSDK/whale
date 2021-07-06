import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OraclePriceAggregration } from '@whale-api-client/api/oracle'

const OraclePriceAggregrationMapping: ModelMapping<OraclePriceAggregration> = {
  type: 'oracle_price_aggregration',
  index: {
    tokenCurrency_height: {
      name: 'oracle_tokenCurrency_height',
      partition: {
        type: 'string',
        key: (d: OraclePriceAggregration) => `${d.data.token}-${d.data.currency}`
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceAggregration) => d.block.height
      }
    }
  }
}

@Injectable()
export class OraclePriceAggregrationMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (token: string, currency: string): Promise<OraclePriceAggregration | undefined> {
    const data = await this.database.query(OraclePriceAggregrationMapping.index.tokenCurrency_height, {
      partitionKey: `${token}-${currency}`,
      order: SortOrder.DESC,
      limit: 1
    })

    return data.length === 0 ? undefined : data[0]
  }

  async get (height: number, token: string, currency: string): Promise<OraclePriceAggregration | undefined> {
    return await this.database.get(OraclePriceAggregrationMapping, `${height}-${token}-${currency}`)
  }

  async put (aggregation: OraclePriceAggregration): Promise<void> {
    return await this.database.put(OraclePriceAggregrationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceAggregrationMapping, id)
  }
}
