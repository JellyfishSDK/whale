import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const SupplyStatMapping: ModelMapping<SupplyStat> = {
  type: 'supply_stat',
  index: {
    height: {
      name: 'supply_stat_height',
      partition: {
        type: 'string',
        key: (d: SupplyStat) => d.id
      }
    }
  }
}

@Injectable()
export class SupplyStatMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<SupplyStat[]> {
    return await this.database.query(SupplyStatMapping.index.height, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (activity: SupplyStat): Promise<void> {
    return await this.database.put(SupplyStatMapping, activity)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(SupplyStatMapping, id)
  }
}

export interface SupplyStat extends Model {
  id: string // ----------------| Hex encoded block height

  circulating: number
  burned: number
  locked: number
  total: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
