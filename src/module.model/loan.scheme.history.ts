import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const LoanSchemeHistoryMapping: ModelMapping<LoanSchemeHistory> = {
  type: 'loan_scheme_history',
  index: {
    key_sort: {
      name: 'loan_scheme_history_key_sort',
      partition: {
        type: 'string',
        key: (ls: LoanSchemeHistory) => ls.loanSchemeId
      },
      sort: {
        type: 'string',
        key: (ls: LoanSchemeHistory) => ls.sort
      }
    }
  }
}

@Injectable()
export class LoanSchemeHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (loanSchemeId: string): Promise<LoanSchemeHistory | undefined> {
    const latest = await this.database.query(LoanSchemeHistoryMapping.index.key_sort, {
      partitionKey: loanSchemeId,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (loanSchemeId: string, limit: number, lt?: string): Promise<LoanSchemeHistory[]> {
    return await this.database.query(LoanSchemeHistoryMapping.index.key_sort, {
      partitionKey: loanSchemeId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async list (limit: number, lt?: string): Promise<LoanSchemeHistory[]> {
    return await this.database.query(LoanSchemeHistoryMapping.index.key_sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<LoanSchemeHistory | undefined> {
    return await this.database.get(LoanSchemeHistoryMapping, id)
  }

  async put (loanSchemeHistory: LoanSchemeHistory): Promise<void> {
    return await this.database.put(LoanSchemeHistoryMapping, loanSchemeHistory)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(LoanSchemeHistoryMapping, id)
  }
}

export interface LoanSchemeHistory extends Model {
  id: string // -------------------------| loanSchemeId-txid
  loanSchemeId: string // ---------------| partition key
  sort: string // -----------------------| encodedHeight-txid
  minColRatio: number
  interestRate: string // ---------------| stringified bignumber
  activateAfterBlock: string // ---------| stringified bignumber
  event: LoanSchemeHistoryEvent

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export enum LoanSchemeHistoryEvent {
  CREATE = 'create',
  UPDATE = 'update',
  DESTROY = 'destroy',
  SET_DEFAULT = 'setDefault'
}
