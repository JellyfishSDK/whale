import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const DefaultLoanSchemeMapping: ModelMapping<DefaultLoanScheme> = {
  type: 'loan_scheme',
  index: {
    loan_scheme_default: {
      name: 'loan_scheme_default',
      partition: {
        type: 'string',
        key: (ls: DefaultLoanScheme) => ls.id
      }
    }
  }
}

@Injectable()
export class DefaultLoanSchemeMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (): Promise<DefaultLoanScheme | undefined> {
    const loanSchemes = await this.database.query(DefaultLoanSchemeMapping.index.loan_scheme_default, {
      order: SortOrder.DESC,
      limit: 1
    })
    return loanSchemes.length === 0 ? undefined : loanSchemes[0]
  }

  async put (loanScheme: DefaultLoanScheme): Promise<void> {
    return await this.database.put(DefaultLoanSchemeMapping, loanScheme)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(DefaultLoanSchemeMapping, id)
  }
}

export interface DefaultLoanScheme extends Model {
  id: string // -------------------------| loanSchemeId
}
