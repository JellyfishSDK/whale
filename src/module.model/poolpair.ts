import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairMapping: ModelMapping<PoolPair> = {
  type: 'poolpair',
  index: {
    symbolId_height: {
      name: 'poolpair_symbolId_height',
      partition: {
        type: 'string',
        key: (p: PoolPair) => p.symbolId
      },
      sort: {
        type: 'number',
        key: (p: PoolPair) => p.block.height
      }
    }
  }
}

@Injectable()
export class PoolPairMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (symbolId: string): Promise<PoolPair | undefined> {
    const poolpairs = await this.database.query(PoolPairMapping.index.symbolId_height, {
      partitionKey: symbolId,
      order: SortOrder.DESC,
      limit: 1
    })
    return poolpairs.length === 0 ? undefined : poolpairs[0]
  }

  async query (symbolId: string, limit: number, lt?: number): Promise<PoolPair[]> {
    return await this.database.query(PoolPairMapping.index.symbolId_height, {
      partitionKey: symbolId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (symbolId: string): Promise<PoolPair | undefined> {
    return await this.database.get(PoolPairMapping, symbolId)
  }

  async put (poolpair: PoolPair): Promise<void> {
    return await this.database.put(PoolPairMapping, poolpair)
  }

  async delete (symbolId: string): Promise<void> {
    return await this.database.delete(PoolPairMapping, symbolId)
  }
}

export interface PoolPair extends Model {
  id: string // tokenAId-tokenBId-blockHeight
  symbolId: string // tokenAId-tokenBId
  poolId: string
  block: {
    hash: string
    height: number
  }
  symbol: string
  status: boolean
  commission: string // bignumber
}
