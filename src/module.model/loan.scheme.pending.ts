import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const LoanSchemeInactiveMapping: ModelMapping<LoanSchemeActivate> = {
  type: 'loan_scheme_activate',
  index: {
    loan_scheme_inactive_id: {
      name: 'loan_scheme_activate_id',
      partition: {
        type: 'string',
        key: (ls: LoanSchemeActivate) => ls.id
      }
    }
  }
}

@Injectable()
export class LoanSchemePendingMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<LoanSchemeActivate[]> {
    return await this.database.query(LoanSchemeInactiveMapping.index.loan_scheme_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<LoanSchemeActivate | undefined> {
    return await this.database.get(LoanSchemeInactiveMapping, id)
  }

  async put (loanSchemeActive: LoanSchemeActivate): Promise<void> {
    return await this.database.put(LoanSchemeInactiveMapping, loanSchemeActive)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(LoanSchemeInactiveMapping, id)
  }
}

export interface LoanSchemeActivate extends Model {
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
