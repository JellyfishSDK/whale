import BigNumber from 'bignumber.js'
import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const PoolSwapAggregationMapping: ModelMapping<PoolSwapAggregation> = {
  type: 'poolswap_aggregation',
  index: {
    id: {
      name: 'poolswap_aggregation_id',
      partition: {
        type: 'string',
        key: (p: PoolSwapAggregation) => p.id
      }
    }
  }
}

@Injectable()
export class PoolSwapAggregationMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, from?: string, to?: string): Promise<PoolSwapAggregation[]> {
    return await this.database.query(PoolSwapAggregationMapping.index.id, {
      limit: limit,
      order: SortOrder.DESC,
      gte: from,
      lte: to
    })
  }

  async get (id: string): Promise<PoolSwapAggregation | undefined> {
    return await this.database.get(PoolSwapAggregationMapping.index.id, id)
  }

  async put (aggregation: PoolSwapAggregation): Promise<void> {
    return await this.database.put(PoolSwapAggregationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolSwapAggregationMapping, id)
  }
}

export interface PoolSwapAggregation extends Model {
  /** date as id in format yyyy-mm-dd, eg: 2021-01-01 */
  id: string

  bucket: PoolSwapHourlyBucket
}

export interface PoolSwapHourlyBucket {
  /** use hour scale for easy first */
  [hours: string]: TotalCount
}

export interface TotalCount {
  total: BigNumber
  count: number
}
