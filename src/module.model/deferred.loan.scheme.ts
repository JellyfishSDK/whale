import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const DeferredLoanSchemeMapping: ModelMapping<DeferredLoanScheme> = {
  type: 'deferred_loan_scheme',
  index: {
    deferred_loan_scheme_id: {
      name: 'deferred_loan_scheme_id',
      partition: {
        type: 'string',
        key: (d: DeferredLoanScheme) => d.id
      }
    }
  }
}

@Injectable()
export class DeferredLoanSchemeMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<DeferredLoanScheme[]> {
    return await this.database.query(DeferredLoanSchemeMapping.index.deferred_loan_scheme_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<DeferredLoanScheme | undefined> {
    return await this.database.get(DeferredLoanSchemeMapping, id)
  }

  async put (deferredLoanScheme: DeferredLoanScheme): Promise<void> {
    return await this.database.put(DeferredLoanSchemeMapping, deferredLoanScheme)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(DeferredLoanSchemeMapping, id)
  }
}

export interface DeferredLoanScheme extends Model {
  id: string
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
