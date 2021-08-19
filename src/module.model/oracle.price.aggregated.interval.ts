import { Injectable } from '@nestjs/common'
import { SortOrder } from '@src/module.database/database'
import { ModelMapping } from '@src/module.database/model'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from './oracle.price.aggregated'

export enum OracleIntervalSeconds {
  FIVE_MINUTES = 5 * 60,
  TEN_MINUTES = 10 * 60,
  ONE_HOUR = 60 * 60,
  ONE_DAY = 24 * 60 * 60
}

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
  query: (key: string, limit: number, lt?: string) => Promise<OraclePriceAggregated[]>
  put: (aggregated: OraclePriceAggregated) => Promise<void>
  delete: (id: string) => Promise<void>
}

// 5-minutes
export class OraclePriceAggregatedInterval5MinuteMapper extends OraclePriceAggregatedMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = OracleIntervalSeconds.FIVE_MINUTES
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
export class OraclePriceAggregatedInterval10MinuteMapper extends OraclePriceAggregatedInterval5MinuteMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = OracleIntervalSeconds.TEN_MINUTES
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)
}

// 1-hour
@Injectable()
export class OraclePriceAggregatedInterval1HourMapper extends OraclePriceAggregatedInterval5MinuteMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = OracleIntervalSeconds.ONE_HOUR
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)
}

// 1-day
@Injectable()
export class OraclePriceAggregatedInterval1DayMapper extends OraclePriceAggregatedInterval5MinuteMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = OracleIntervalSeconds.ONE_DAY
  public readonly mapping: ModelMapping<OraclePriceAggregated> = getOraclePriceAggregatedIntervalMapping(this.interval)
}
