import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const LoanSchemePendingMapping: ModelMapping<LoanSchemePending> = {
  type: 'loan_scheme_activate',
  index: {
    loan_scheme_inactive_id: {
      name: 'loan_scheme_activate_id',
      partition: {
        type: 'string',
        key: (ls: LoanSchemePending) => ls.id
      }
    }
  }
}

@Injectable()
export class LoanSchemePendingMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<LoanSchemePending[]> {
    return await this.database.query(LoanSchemePendingMapping.index.loan_scheme_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<LoanSchemePending | undefined> {
    return await this.database.get(LoanSchemePendingMapping, id)
  }

  async put (loanSchemePending: LoanSchemePending): Promise<void> {
    return await this.database.put(LoanSchemePendingMapping, loanSchemePending)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(LoanSchemePendingMapping, id)
  }
}

export interface LoanSchemePending extends Model {
  id: string // loanSchemeId
  ratio: number
  rate: BigNumber
  activateAfterBlock: BigNumber

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
