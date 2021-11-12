import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const LoanSchemeMapping: ModelMapping<LoanScheme> = {
  type: 'loan_scheme',
  index: {
    loan_scheme_id: {
      name: 'loan_scheme_id',
      partition: {
        type: 'string',
        key: (ls: LoanScheme) => ls.id
      }
    }
  }
}

@Injectable()
export class LoanSchemeMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<LoanScheme[]> {
    return await this.database.query(LoanSchemeMapping.index.loan_scheme_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<LoanScheme | undefined> {
    return await this.database.get(LoanSchemeMapping, id)
  }

  async put (loanScheme: LoanScheme): Promise<void> {
    return await this.database.put(LoanSchemeMapping, loanScheme)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(LoanSchemeMapping, id)
  }
}

export interface LoanScheme extends Model {
  id: string // loanSchemeId
  ratio: number
  rate: BigNumber
  activationHeight: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
