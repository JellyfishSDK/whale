import { Injectable } from '@nestjs/common'
import { ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { OracleAppointedWeightage } from '@whale-api-client/api/oracle'

const OracleAppointedWeightageMapping: ModelMapping<OracleAppointedWeightage> = {
  type: 'oracle_appointed_weightage',
  index: {
    oracleId_height: {
      name: 'oracle_appointed_weightage_oracleId-height',
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

  async getLatestByOracleIdHeight (oracleId: string, height: number): Promise<OracleAppointedWeightage | undefined> {
    const data = await this.database.query(OracleAppointedWeightageMapping.index.oracleId_height, {
      partitionKey: oracleId,
      order: SortOrder.DESC,
      lt: height,
      limit: 1
    })

    return data.length === 0 ? undefined : data[0]
  }

  async get (oracleId: string, height: number): Promise<OracleAppointedWeightage | undefined> {
    return await this.database.get(OracleAppointedWeightageMapping, `${oracleId}-${height}`)
  }

  async put (weightage: OracleAppointedWeightage): Promise<void> {
    return await this.database.put(OracleAppointedWeightageMapping, weightage)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OracleAppointedWeightageMapping, id)
  }
}
