import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const OraclePriceMapping: ModelMapping<OraclePrice> = {
  type: 'oracle',
  index: {
    id: {
      name: 'oracle_priceid',
      partition: {
        type: 'string',
        key: (b: OraclePrice) => b.id
      }
    }
  }
}

@Injectable()
export class OraclePriceMapper {
  public constructor (protected readonly database: Database) {
  }

  async getById (id: string): Promise<OraclePrice | undefined> {
    return await this.database.get(OraclePriceMapping.index.id, id)
  }

  async getByPriceFeedId (priceFeedId: string): Promise<OraclePrice[] | undefined> {
    const oracles = await this.database.query(OraclePriceMapping.index.id, {
      order: SortOrder.DESC,
      limit: 100
    })

    return oracles.filter(o => o.priceFeedId === priceFeedId)
  }

  async put (oraclePriceFeed: OraclePrice): Promise<void> {
    return await this.database.put(OraclePriceMapping, oraclePriceFeed)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceMapping, id)
  }
}

export interface OraclePrice extends Model {
  id: string
  priceFeedId: string
  price: number
  timestamp: number
  createdAt: Date
}
