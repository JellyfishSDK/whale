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
   * id is constructed by poolId + '@' + bucketId eg: 0-1@2020-08-31T15:20
   */

  /**
   * poolpair "0-1" as id
   */
  poolId: string
  /**
   * store datetime in ISO8601 string format YYYY-MM-DDTHH:mm (minute scale), eg: 2021-04-01T13:20
   */
  bucketId: string

  total: BigNumber
  count: number
}
