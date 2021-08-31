import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import { HexEncoder } from './_hex.encoder'
import BigNumber from 'bignumber.js'

export const DCT_ID_START = 128

const TokenMapping: ModelMapping<Token> = {
  type: 'token',
  index: {
    sort: {
      name: 'token_key_sort',
      partition: {
        type: 'string',
        key: (b: Token) => b.sort
      }
    }
  }
}

@Injectable()
export class TokenMapper {
  public constructor (protected readonly database: Database) {
  }

  // Note this will work until we have created over 128 DAT tokens,
  // as of implementation time, there exist 14 DAT tokens
  async getLatestDAT (): Promise<Token | undefined> {
    const latest = await this.database.query(TokenMapping.index.sort, {
      limit: 1,
      order: SortOrder.DESC,
      lt: HexEncoder.encodeHeight(DCT_ID_START)
    })

    return latest[0]
  }

  async getLatestDST (): Promise<Token | undefined> {
    const latest = await this.database.query(TokenMapping.index.sort, {
      limit: 1,
      order: SortOrder.DESC
    })

    if (latest.length === 0 || new BigNumber(latest[0].id).lt(DCT_ID_START)) {
      return undefined
    }

    return latest[0]
  }

  async query (limit: number, lt?: string): Promise<Token[]> {
    return await this.database.query(TokenMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Token | undefined> {
    return await this.database.get(TokenMapping, id)
  }

  async put (token: Token): Promise<void> {
    return await this.database.put(TokenMapping, token)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(TokenMapping, id)
  }
}

export interface Token extends Model {
  id: string // ---------| tokenId (decimal encoded integer as string)
  sort: string // -------| tokenId (hex encoded)

  symbol: string
  name: string
  decimal: number
  limit: string
  isDAT: boolean
  isLPS: boolean
  tradeable: boolean
  mintable: boolean

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
