import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleAppointedTokenCurrency } from '@whale-api-client/api/oracle'

const OracleAppointedTokenCurrencyMapping: ModelMapping<OracleAppointedTokenCurrency> = {
  type: 'oracle_appointed_token_currency',
  index: {
    id: {
      name: 'oracle_appointed_token_currency_id',
      partition: {
        type: 'string',
        key: (d: OracleAppointedTokenCurrency) => `${d.data.token}-${d.data.currency}-${d.block.height}`
      }
    },
    oracleId_tokenCurrencyHeight: {
      name: 'oracle_appointed_token_currency_oracleId-tokenCurrencyHeight',
      partition: {
        type: 'string',
        key: (d: OracleAppointedTokenCurrency) => d.data.oracleId
      },
      sort: {
        type: 'string',
        key: (d: OracleAppointedTokenCurrency) => `${d.data.token}-${d.data.currency}-${d.block.height}`
      }
    }
  }
}

@Injectable()
export class OracleAppointedTokenCurrencyMapper {
  public constructor (protected readonly database: Database) {
  }

  async list (): Promise<OracleAppointedTokenCurrency[] | undefined> {
    return await this.database.query(OracleAppointedTokenCurrencyMapping.index.id, {
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async listByOracleId (oracleId: string): Promise<OracleAppointedTokenCurrency[] | undefined> {
    return await this.database.query(OracleAppointedTokenCurrencyMapping.index.oracleId_tokenCurrencyHeight, {
      partitionKey: oracleId,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async get (oracleId: string, token: string, currency: string, height: number): Promise<OracleAppointedTokenCurrency | undefined> {
    return await this.database.get(OracleAppointedTokenCurrencyMapping, `${oracleId}-${token}-${currency}-${height}`)
  }

  async put (tokenCurrency: OracleAppointedTokenCurrency): Promise<void> {
    return await this.database.put(OracleAppointedTokenCurrencyMapping, tokenCurrency)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleAppointedTokenCurrencyMapping, id)
  }
}
