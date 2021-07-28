import BigNumber from 'bignumber.js'
import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { roundTimestampMinutes } from '@src/utils'

const PoolSwapAggregationMapping: ModelMapping<PoolSwapAggregation> = {
  type: 'poolswap_aggregation',
  index: {
    poolId_bucketId: {
      name: 'poolswap_aggregation_symbolId_bucketId',
      partition: {
        type: 'string',
        key: (p: PoolSwapAggregation) => p.poolId
      },
      sort: {
        type: 'number',
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
      // NOTE(canonbrother): add 'Z' to ensure UTC timezone before round
      // 'round' is required as all bucketIds are rounded
      // else 'lte: 2020-05-01T23:59' will not get listed in 2020-05-01T23:50 bucket
      gte: from !== undefined ? roundTimestampMinutes(new Date(from + 'Z').valueOf()) : undefined,
      lte: to !== undefined ? roundTimestampMinutes(new Date(to + 'Z').valueOf()) : undefined
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
  id: string

  poolId: string
  /**
   * act as timestamp in 10 mins scale
   */
  bucketId: number

  volume: {
    [tokenId: string]: {
      total: BigNumber
      count: number
    }
  }
}
