import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const LoanTokenHistoryMapping: ModelMapping<LoanTokenHistory> = {
  type: 'loan_token',
  index: {
    sort: {
      name: 'loan_token_token_height',
      partition: {
        type: 'string',
        key: (lt: LoanTokenHistory) => lt.tokenId
      },
      sort: {
        type: 'number',
        key: (lt: LoanTokenHistory) => lt.block.height
      }
    }
  }
}

@Injectable()
export class LoanTokenHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<LoanTokenHistory[]> {
    return await this.database.query(LoanTokenHistoryMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<LoanTokenHistory | undefined> {
    return await this.database.get(LoanTokenHistoryMapping, id)
  }

  async put (token: LoanTokenHistory): Promise<void> {
    return await this.database.put(LoanTokenHistoryMapping, token)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(LoanTokenHistoryMapping, id)
  }
}

export interface LoanTokenHistory extends Model {
  id: string // ---------| tokenSymbol-height

  symbol: string
  interest: string

  tokenCurrency: string // ---| tokenCurrencyMapper partition key
  tokenId: string // ----------| tokenId (hex encoded), loanTokenMapper and tokenMapper partition key

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
