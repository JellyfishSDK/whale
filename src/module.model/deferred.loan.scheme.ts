import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const DeferredLoanSchemeMapping: ModelMapping<DeferredLoanScheme> = {
  type: 'deferred_loan_scheme',
  index: {
    key_sort: {
      name: 'deferred_loan_scheme_key_sort',
      partition: {
        type: 'string',
        key: (d: DeferredLoanScheme) => d.activateAfterBlock.toString()
      },
      sort: {
        type: 'number',
        key: (d: DeferredLoanScheme) => d.block.height
      }
    }
  }
}

@Injectable()
export class DeferredLoanSchemeMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (activateAfterBlock: number, limit: number, lt?: number): Promise<DeferredLoanScheme[]> {
    return await this.database.query(DeferredLoanSchemeMapping.index.key_sort, {
      partitionKey: activateAfterBlock,
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
  id: string // ----------| loanSchemeId-height
  sort: string // --------| height encoded
  loanSchemeId: string
  minColRatio: number
  interestRate: string
  activateAfterBlock: string

  block: {
    hash: string
    height: number // ----| as sort key
    time: number
    medianTime: number
  }
}
