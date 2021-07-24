import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleAppointed } from '@whale-api-client/api/oracle'

const OracleAppointedMapping: ModelMapping<OracleAppointed> = {
  type: 'oracle_appointed',
  index: {
    oracleIdTokenCurrencyHeight: {
      name: 'oracle_appointed_oracleIdTokenCurrencyHeight',
      partition: {
        type: 'string',
        key: (d: OracleAppointed) => `${d.data.oracleId}-${d.data.token}-${d.data.currency}-${d.block.height.toString()}`
      }
    },
    oracleId_tokenCurrencyHeight: {
      name: 'oracle_appointed_oracleId-tokenCurrencyHeight',
      partition: {
        type: 'string',
        key: (d: OracleAppointed) => d.data.oracleId
      },
      sort: {
        type: 'string',
        key: (d: OracleAppointed) => `${d.data.token}-${d.data.currency}-${d.block.height.toString()}`
      }
    },
    oracleIdTokenCurrency_height: {
      name: 'oracle_appointed_oracleIdTokenCurrency-height',
      partition: {
        type: 'string',
        key: (d: OracleAppointed) => `${d.data.oracleId}-${d.data.token}-${d.data.currency}`
      },
      sort: {
        type: 'number',
        key: (d: OracleAppointed) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleAppointedMapper {
  public constructor (protected readonly database: Database) {
  }

  async list (): Promise<OracleAppointed[] | undefined> {
    return await this.database.query(OracleAppointedMapping.index.oracleIdTokenCurrencyHeight, {
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getByOracleId (oracleId: string): Promise<OracleAppointed[] | undefined> {
    return await this.database.query(OracleAppointedMapping.index.oracleId_tokenCurrencyHeight, {
      partitionKey: oracleId,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getLatestByOracleIdTokenCurrencyHeight (oracleId: string, token: string, currency: string, height: number): Promise<OracleAppointed | undefined> {
    const data = await this.database.query(OracleAppointedMapping.index.oracleIdTokenCurrency_height, {
      partitionKey: `${oracleId}-${token}-${currency}`,
      order: SortOrder.DESC,
      lt: height,
      limit: 1
    })

    return data.length === 0 ? undefined : data[0]
  }

  async get (oracleId: string, token: string, currency: string, height: number): Promise<OracleAppointed | undefined> {
    return await this.database.get(OracleAppointedMapping, `${oracleId}-${token}-${currency}-${height.toString()}`)
  }

  async put (appointed: OracleAppointed): Promise<void> {
    return await this.database.put(OracleAppointedMapping, appointed)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleAppointedMapping, id)
  }
}
