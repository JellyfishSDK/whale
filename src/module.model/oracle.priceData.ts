import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database } from '@src/module.database/database'

const OraclePriceDataMapping: ModelMapping<OraclePriceData> = {
  type: 'oracle_price_data',
  index: {
    id_height: {
      name: 'oracle_price_data',
      partition: {
        type: 'string',
        key: (d: OraclePriceData) => d.id
      },
      sort: {
        type: 'number',
        key: (d: OraclePriceData) => d.block.height
      }
    }
  }
}

@Injectable()
export class OraclePriceDataMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (id: string): Promise<OraclePriceData | undefined> {
    return await this.database.get(OraclePriceDataMapping, id)
  }

  async put (id: OraclePriceData): Promise<void> {
    return await this.database.put(OraclePriceDataMapping, id)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceDataMapping, id)
  }
}

export interface OraclePriceData extends Model {
  id: string
  block: {
    height: number
  }
  data: {
    timestamp: number
    token: string
    currency: string
    oracleid: string
    amount: number
  }
}
