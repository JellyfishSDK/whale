import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'

const DctIdMapping: ModelMapping<DctId> = {
  type: 'dctId',
  index: {
    id: {
      name: 'dctId_id',
      partition: {
        type: 'string',
        key: (d: DctId) => d.id
      }
    }
  }
}

@Injectable()
export class DctIdMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (): Promise<DctId | undefined> {
    const dctIds = await this.database.query(DctIdMapping.index.id, {
      order: SortOrder.DESC,
      limit: 1
    })
    return dctIds.length === 0 ? undefined : dctIds[0]
  }

  async put (dctId: DctId): Promise<void> {
    return await this.database.put(DctIdMapping, dctId)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(DctIdMapping, id)
  }
}

export interface DctId extends Model {
  id: string
}
