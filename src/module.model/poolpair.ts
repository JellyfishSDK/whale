import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const PoolPairMapping: ModelMapping<PoolPair> = {
  type: 'poolpair',
  index: {
    sort: {
      name: 'poolpair_key_sort',
      partition: {
        type: 'string',
        key: (p: PoolPair) => p.key
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

  async getLatest (): Promise<PoolPair | undefined> {
    const latest = await this.database.query(PoolPairMapping.index.height, {
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (limit: number, lt?: string): Promise<PoolPair[]> {
    return await this.database.query(PoolPairMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<PoolPair | undefined> {
    return await this.database.get(PoolPairMapping, id)
  }

  async put (masternode: PoolPair): Promise<void> {
    return await this.database.put(PoolPairMapping, masternode)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolPairMapping, id)
  }
}

export interface PoolPair extends Model {
  id: string // tokenAId-tokenBId-blockHeight
  key: string // tokenAId-tokenBId
  pairSymbol: string // string
  tokenA: {
    id: number // numerical id
  }
  tokenB: {
    id: number // numerical id
  }
  block: {
    hash: string
    height: number
  }
  status: boolean // active
  commission: string // bignumber
}
