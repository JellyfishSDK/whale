import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const LoanTokenHistoryMapping: ModelMapping<LoanTokenHistory> = {
  type: 'loan_token_history',
  index: {
    height_token_id: {
      name: 'loan_token_history_loan_height_token_id',
      partition: {
        type: 'string',
        key: (lt: LoanTokenHistory) => lt.id
      }
    },
    partitioned_by_loan_token: {
      name: 'loan_token_history_loan_token_id_height',
      partition: {
        type: 'string',
        key: (lt: LoanTokenHistory) => lt.loanTokenId
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

  async query (loanTokenId: string, limit: number, lt?: string): Promise<LoanTokenHistory[]> {
    return await this.database.query(LoanTokenHistoryMapping.index.partitioned_by_loan_token, {
      partitionKey: loanTokenId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async queryAll (limit: number, lt?: string): Promise<LoanTokenHistory[]> {
    return await this.database.query(LoanTokenHistoryMapping.index.partitioned_by_loan_token, {
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
  id: string // ---------------| <height> - <32 bytes id in hex>, height first, ensure chronologically sorted

  symbol: string
  name: string
  interest: string
  mintable: boolean
  tokenCurrency: string // ----| tokenCurrencyMapper partition key (aka fixedIntervalPriceId)
  loanTokenId: string // ------| <32 bytes id in hex>

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
