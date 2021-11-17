import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const DeferredModelMapping: ModelMapping<DeferredModel> = {
  type: 'deferred',
  index: {
    deferred_id: {
      name: 'deferred_id',
      partition: {
        type: 'string',
        key: (d: DeferredModel) => d.id
      }
    }
  }
}

@Injectable()
export class DeferredModelMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<DeferredModel[]> {
    return await this.database.query(DeferredModelMapping.index.deferred_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<DeferredModel | undefined> {
    return await this.database.get(DeferredModelMapping, id)
  }

  async put (deferredModel: DeferredModel): Promise<void> {
    return await this.database.put(DeferredModelMapping, deferredModel)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(DeferredModelMapping, id)
  }
}

export interface DeferredModel extends Model {
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
