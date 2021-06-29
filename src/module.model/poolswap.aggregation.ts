import BigNumber from 'bignumber.js'
import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const PoolSwapAggregationMapping: ModelMapping<PoolSwapAggregation> = {
  type: 'poolswap_aggregation',
  index: {
    poolId_bucketId: {
      name: 'poolswap_aggregation_poolId_bucketId',
      partition: {
        type: 'string',
        key: (p: PoolSwapAggregation) => p.poolId
      },
      sort: {
        type: 'string',
        key: (p: PoolSwapAggregation) => p.bucketId
      }
    }
  }
}

@Injectable()
export class PoolSwapAggregationMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (poolId: string, limit: number, from?: string, to?: string): Promise<PoolSwapAggregation[]> {
    return await this.database.query(PoolSwapAggregationMapping.index.poolId_bucketId, {
      partitionKey: poolId,
      limit: limit,
      order: SortOrder.DESC,
      gte: from,
      lte: to
    })
  }

  // async get (poolId: string, bucketId: string): Promise<PoolSwapAggregation | undefined> {
  //   return await this.database.get(PoolSwapAggregationMapping.index.poolId_bucketId, poolId, bucketId)
  // }

  async get (id: string): Promise<PoolSwapAggregation | undefined> {
    return await this.database.get(PoolSwapAggregationMapping, id)
  }

  async put (aggregation: PoolSwapAggregation): Promise<void> {
    return await this.database.put(PoolSwapAggregationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolSwapAggregationMapping, id)
  }
}

export interface PoolSwapAggregation extends Model {
  /**
   * poolpair "1-0" as id
   */
  poolId: string
  /**
   * store datetime in ISO8601 string format YYYY-MM-DDTHH:mm:ss.sssZ, eg: 2021-04-01T13:20:00Z
   */
  bucketId: string // sort key e.g. modded time, 10 minutes interval?

  // e.g. from TotalCount
  total: BigNumber
  count: number
}
// instead of this design, a better design would be having the bucket as part of the secondary sort key space
// Instead of querying a day, you can query the last 24 hours via range operator. (Slice Window)
// If you want to query a day you just need to construct a 24-hour range query.
