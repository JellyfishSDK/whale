import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairMapping: ModelMapping<PoolPair> = {
  type: 'poolpair',
  index: {
    id: {
      name: 'poolpair_id',
      partition: {
        type: 'string',
        key: (p: PoolPair) => p.id
      },
      sort: {
        type: 'string',
        key: (p: PoolPair) => p.id
      }
    }
  }
}

@Injectable()
export class PoolPairMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (id: string, limit: number, gt?: string): Promise<PoolPair[]> {
    return await this.database.query(PoolPairMapping.index.id, {
      partitionKey: id,
      limit: limit,
      order: SortOrder.ASC,
      gt: gt
    })
  }

  async get (id: string): Promise<PoolPair | undefined> {
    return await this.database.get(PoolPairMapping, id)
  }

  async put (poolpair: PoolPair): Promise<void> {
    return await this.database.put(PoolPairMapping, poolpair)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolPairMapping, id)
  }
}

export interface PoolPair extends Model {
  id: string // ----------------| unique id of the poolpair
  symbol: string
  name: string
  status: string

  tokenA: {
    id: string
    reserve: number
    blockCommission: string
  }

  tokenB: {
    id: string
    reserve: number
    blockCommission: number
  }

  commission: number
  totalLiquidity: number
  tradeEnabled: boolean

  ownerAddress: string
  rewardPct: number
  customRewards: number

  creation: {
    tx: string
    height: number
  }
}
