import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const DefaultLoanSchemeMapping: ModelMapping<DefaultLoanScheme> = {
  type: 'default_loan_scheme',
  index: {
    default_loan_scheme: {
      name: 'default_loan_scheme',
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
    const loanSchemes = await this.database.query(DefaultLoanSchemeMapping.index.default_loan_scheme, {
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
