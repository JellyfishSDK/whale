import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const PoolSwapMapping: ModelMapping<PoolSwap> = {
  type: 'pool_swap',
  index: {
    key_sort: {
      name: 'pool_swap_key_sort',
      partition: {
        type: 'string',
        key: (b: PoolSwap) => b.key
      },
      sort: {
        type: 'string',
        key: (b: PoolSwap) => b.sort
      }
    }
  }
}

@Injectable()
export class PoolSwapMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (key: string, limit: number, lt?: string): Promise<PoolSwap[]> {
    return await this.database.query(PoolSwapMapping.index.key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (feed: PoolSwap): Promise<void> {
    return await this.database.put(PoolSwapMapping, feed)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(PoolSwapMapping, id)
  }
}

export interface PoolSwap extends Model {
  id: string // ---------| poolpairId-txid
  key: string // --------| poolpairId
  sort: string // -------| height-txid

  poolPairId: string // ------| poolPairId (decimal encoded integer as string)
  fromAmount: string // ------| bignumber
  fromToken: number // -------| number
}
