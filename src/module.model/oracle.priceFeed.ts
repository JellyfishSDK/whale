import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceFeedMapping: ModelMapping<OraclePriceFeed> = {
  type: 'oracle',
  index: {
    id: {
      name: 'oracle_priceFeedid',
      partition: {
        type: 'string',
        key: (b: OraclePriceFeed) => b.id
      }
    }
  }
}

@Injectable()
export class OraclePriceFeedMapper {
  public constructor (protected readonly database: Database) {
  }

  async getById (id: string): Promise<OraclePriceFeed | undefined> {
    return await this.database.get(OraclePriceFeedMapping.index.id, id)
  }

  async getByTokenAndCurrency (token: string, currency: string): Promise<OraclePriceFeed[] | undefined> {
    const oracles = await this.database.query(OraclePriceFeedMapping.index.id, {
      order: SortOrder.DESC,
      limit: 100
    })

    return oracles.filter(o => o.token === token && o.currency === currency)
  }

  // async getByCategory (category: string): Promise<OraclePriceFeed[] | undefined> {
  //   const oracles = await this.database.query(OraclePriceFeedMapping.index.id, {
  //     order: SortOrder.DESC,
  //     limit: 100
  //   })
  //
  //   return oracles.filter(o => o.category === category)
  // }

  async put (oraclePriceFeed: OraclePriceFeed): Promise<void> {
    return await this.database.put(OraclePriceFeedMapping, oraclePriceFeed)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceFeedMapping, id)
  }
}

export interface OraclePriceFeed extends Model {
  id: string
  token: string
  currency: string
  createdAt: Date
}
