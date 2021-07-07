import BigNumber from 'bignumber.js'
import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const TokenMapping: ModelMapping<Token> = {
  type: 'token',
  index: {
    height: {
      name: 'token_height',
      partition: {
        type: 'number',
        key: (t: Token) => t.block.height
      }
    }
  }
}

@Injectable()
export class TokenMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (): Promise<Token | undefined> {
    const token = await this.database.query(TokenMapping.index.height, {
      order: SortOrder.DESC,
      limit: 1
    })
    return token.length === 0 ? undefined : token[0]
  }

  async query (limit: number, lt?: number): Promise<Token[]> {
    return await this.database.query(TokenMapping.index.height, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Token | undefined> {
    return await this.database.get(TokenMapping, id)
  }

  async put (aggregation: Token): Promise<void> {
    return await this.database.put(TokenMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(TokenMapping, id)
  }
}

export interface Token extends Model {
  id: string
  block: {
    hash: string
    height: number
  }
  symbol: string
  symbolId?: string // its poolId eg: '1-0'
  name: string
  decimal: number
  limit: BigNumber
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
}
