import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairMapping: ModelMapping<PoolPair> = {
  type: 'poolpair',
  index: {
    poolId: {
      name: 'poolpair_poolId',
      partition: {
        type: 'string',
        key: (p: PoolPair) => p.poolId
      }
    }
  }
}

@Injectable()
export class PoolPairMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (): Promise<PoolPair | undefined> {
    const poolpairs = await this.database.query(PoolPairMapping.index.poolId, {
      order: SortOrder.DESC,
      limit: 1
    })
    return poolpairs.length === 0 ? undefined : poolpairs[0]
  }

  async query (limit: number, lt?: number): Promise<PoolPair[]> {
    return await this.database.query(PoolPairMapping.index.poolId, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
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
  id: string // tokenAId-tokenBId
  poolId: string
  block: {
    hash: string
    height: number
  }
  symbol: string
  status: boolean
  commission: string // bignumber
  tokenA: string
  tokenB: string
}
