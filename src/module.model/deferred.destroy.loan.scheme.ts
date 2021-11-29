import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const DeferredDestroyLoanSchemeMapping: ModelMapping<DeferredDestroyLoanScheme> = {
  type: 'deferred_destroy_loan_scheme',
  index: {
    key_sort: {
      name: 'deferred_destroy_loan_scheme_key_sort',
      partition: {
        type: 'string',
        key: (d: DeferredDestroyLoanScheme) => d.activateAfterBlock.toString()
      },
      sort: {
        type: 'string',
        key: (d: DeferredDestroyLoanScheme) => d.sort
      }
    }
  }
}

@Injectable()
export class DeferredDestroyLoanSchemeMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (activateAfterBlock: number, limit: number, lt?: number): Promise<DeferredDestroyLoanScheme[]> {
    return await this.database.query(DeferredDestroyLoanSchemeMapping.index.key_sort, {
      partitionKey: activateAfterBlock,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<DeferredDestroyLoanScheme | undefined> {
    return await this.database.get(DeferredDestroyLoanSchemeMapping, id)
  }

  async put (DeferredDestroyLoanScheme: DeferredDestroyLoanScheme): Promise<void> {
    return await this.database.put(DeferredDestroyLoanSchemeMapping, DeferredDestroyLoanScheme)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(DeferredDestroyLoanSchemeMapping, id)
  }
}

export interface DeferredDestroyLoanScheme extends Model {
  id: string // ----------------------| loanSchemeId-height
  sort: string // --------------------| Hex encoded height
  loanSchemeId: string
  activateAfterBlock: string // ------| stringified bignumber
  activated: boolean

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
