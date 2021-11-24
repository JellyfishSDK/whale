import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const LoanTokenMapping: ModelMapping<LoanToken> = {
  type: 'loan_token',
  index: {
    sort: {
      name: 'loan_token_token_id',
      partition: {
        type: 'string',
        key: (b: LoanToken) => b.tokenId
      }
    }
  }
}

@Injectable()
export class LoanTokenMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<LoanToken[]> {
    return await this.database.query(LoanTokenMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async getByTokenId (tokenId: string): Promise<LoanToken | undefined> {
    const oneAndOnly = await this.database.query(LoanTokenMapping.index.sort, {
      partitionKey: tokenId,
      limit: 1,
      order: SortOrder.DESC
    })
    return oneAndOnly[0]
  }

  async get (id: string): Promise<LoanToken | undefined> {
    return await this.database.get(LoanTokenMapping, id)
  }

  async put (token: LoanToken): Promise<void> {
    return await this.database.put(LoanTokenMapping, token)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(LoanTokenMapping, id)
  }
}

export interface LoanToken extends Model {
  id: string // -----------| 32 bytes id in hex
  interest: string

  tokenCurrency: string // ---| token-currency (symbol-symbol)
  tokenId: string // ----------| tokenId (number string)

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
