import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { SupplyStat } from './supply.stat'

const SupplyStatAggregationMapping: ModelMapping<SupplyStatAggregation> = {
  type: 'aggregated_supply_stat',
  index: {
    height: {
      name: 'aggregated_supply_stat_height',
      partition: {
        type: 'string',
        key: (d: SupplyStatAggregation) => d.id
      }
    }
  }
}

@Injectable()
export class SupplyStatAggregationMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<SupplyStatAggregation[]> {
    return await this.database.query(SupplyStatAggregationMapping.index.height, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (activity: SupplyStatAggregation): Promise<void> {
    return await this.database.put(SupplyStatAggregationMapping, activity)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(SupplyStatAggregationMapping, id)
  }
}

export interface SupplyStatAggregation extends SupplyStat {
  // meant to be 100% identical, aggregation here is running sum
}
