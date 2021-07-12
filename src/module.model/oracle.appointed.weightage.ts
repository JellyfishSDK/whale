import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleAppointedWeightage } from '@whale-api-client/api/oracle'

const OracleAppointedWeightageMapping: ModelMapping<OracleAppointedWeightage> = {
  type: 'oracle_appointed_weightage',
  index: {
    oracleId_height: {
      name: 'oracle_appointed_weightage_oracleId_height',
      partition: {
        type: 'string',
        key: (d: OracleAppointedWeightage) => d.data.oracleId
      },
      sort: {
        type: 'number',
        key: (d: OracleAppointedWeightage) => d.block.height
      }
    }
  }
}

@Injectable()
export class OracleAppointedWeightageMapper {
  public constructor (protected readonly database: Database) {
  }

  async list (oracleId: string): Promise<OracleAppointedWeightage[] | undefined> {
    return await this.database.query(OracleAppointedWeightageMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.ASC,
      limit: 1000000
    })
  }

  async getLatest (oracleId: string): Promise<OracleAppointedWeightage | undefined> {
    const data = await this.database.query(OracleAppointedWeightageMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.DESC,
      limit: 1
    })

    return data.length === 0 ? undefined : data[0]
  }

  async get (oracleId: string, height: number): Promise<OracleAppointedWeightage | undefined> {
    return await this.database.get(OracleAppointedWeightageMapping, `${oracleId}-${height}`)
  }

  async put (oracleAppointedWeightage: OracleAppointedWeightage): Promise<void> {
    return await this.database.put(OracleAppointedWeightageMapping, oracleAppointedWeightage)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleAppointedWeightageMapping, id)
  }
}
