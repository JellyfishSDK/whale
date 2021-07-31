import { Injectable } from '@nestjs/common'
import { SortOrder } from '@src/module.database/database'
import { ModelMapping } from '@src/module.database/model'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from './oracle.price.aggregated'

/**
 * Assuming 30 second blocks, these classic provide a rough interval in which
 * prices are mapped, they are post-fixed by the block count interval
 *
 * e.g. OraclePriceAggregatedInverval10Mapper refers to a 5-minute interval
 */

const getOraclePriceAggregatedIntervalMapping = (interval: number): ModelMapping<OraclePriceAggregated> => ({
  type: `oracle_price_aggregated_${interval}`,
  index: {
    key_sort: {
      name: `oracle_price_aggregated_${interval}_key_sort`,
      partition: {
        type: 'string',
        key: (b: OraclePriceAggregated) => b.key
      },
      sort: {
        type: 'string',
        key: (b: OraclePriceAggregated) => b.sort
      }
    }
  }
})

// interface
export interface OraclePriceAggregatedIntervalMapper {
  readonly interval: number
  put: (aggregated: OraclePriceAggregated) => Promise<void>
  delete: (id: string) => Promise<void>
}

// 5-minutes
export class OraclePriceAggregatedInterval10Mapper extends OraclePriceAggregatedMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 10
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)

  async query (key: string, limit: number, lt?: string): Promise<OraclePriceAggregated[]> {
    return await this.database.query(this.mapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (aggregated: OraclePriceAggregated): Promise<void> {
    return await this.database.put(this.mapping, aggregated)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(this.mapping, id)
  }
}

// 10-minutes
@Injectable()
export class OraclePriceAggregatedInterval20Mapper extends OraclePriceAggregatedInterval10Mapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 20
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)
}

// 1-hour
@Injectable()
export class OraclePriceAggregatedInterval120Mapper extends OraclePriceAggregatedInterval10Mapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 120
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)
}

// 1-day
@Injectable()
export class OraclePriceAggregatedInterval2880Mapper extends OraclePriceAggregatedInterval10Mapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 2880
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)
}
