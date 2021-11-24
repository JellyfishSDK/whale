import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { HexEncoder } from './_hex.encoder'
import { Injectable } from '@nestjs/common'

export interface DeferrableModel extends Model {
  uniqueKey: string
  activationHeight: number
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface DeferredModel<T extends DeferrableModel> extends Model {
  id: string
  activated: boolean
  data: T
}

class BaseMapper<M extends (DeferrableModel | DeferredModel<DeferrableModel>)> {
  constructor (
    protected readonly database: Database,
    public readonly mapping: ModelMapping<M>
  ) { }

  async get (id: string): Promise<M | undefined> {
    return await this.database.get(this.mapping, id)
  }

  async put (data: M): Promise<void> {
    return await this.database.put(this.mapping, data)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(this.mapping, id)
  }
}

class HistoryMapper<M extends DeferrableModel> extends BaseMapper<M> {
  constructor (
    protected readonly database: Database,
    public readonly mapping: ModelMapping<M>
  ) {
    super(database, mapping)
  }

  /**
   * To find newest activated, below specific height, with highest block height
   * example:
   * A(t0): update with activation height = t4
   * B(t1): update with activation height = t5
   * C(t2): update with activation height = t4
   * D(t3): update with activation height = t8
   *
   * return B if query execute at height t6
   * return C if query execute at height t5
   *
   * @param {number} ltBlockHeight
   */
  async getLastActivated (uniqueKey: string, ltBlockHeight: number): Promise<M | undefined> {
    const activatedBefore = HexEncoder.encodeHeight(ltBlockHeight)
    const list = await this.database.query(this.mapping.index.mandatory_index, {
      partitionKey: uniqueKey,
      limit: 1,
      order: SortOrder.DESC,
      lt: `${activatedBefore}-ffffffff`
    })
    return list[0]
  }

  async query (partitionKey: string, limit: number, lt?: string): Promise<M[]> {
    return await this.database.query(this.mapping.index.mandatory_index, {
      partitionKey: partitionKey,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async getCount (uniqueKey: string, blockHeight: number): Promise<number> {
    const partitionByKeyByBlock = `${blockHeight}-${uniqueKey}`
    console.log('count for partition', partitionByKeyByBlock)
    const list = await this.database.query(this.mapping.index.mandatory_index_3, {
      // partitionKey: partitionByKeyByBlock,
      limit: Number.MAX_SAFE_INTEGER,
      order: SortOrder.DESC,
      gte: `${HexEncoder.encodeHeight(blockHeight)}-00000000-${uniqueKey}`,
      lte: `${HexEncoder.encodeHeight(blockHeight)}-ffffffff-${uniqueKey}`
    })
    console.log('counting list', list)
    return list.length
  }

  async queryAll (limit: number, lt?: string): Promise<M[]> {
    return await this.database.query(this.mapping.index.mandatory_index_3, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }
}

class DeferredMapper<M extends DeferredModel<DeferrableModel>> extends BaseMapper<M> {
  constructor (
    protected readonly database: Database,
    public readonly mapping: ModelMapping<M>
  ) {
    super(database, mapping)
  }

  async query (activated: boolean, activationHeight: number): Promise<M[]> {
    const partitionKey = `${activated ? 1 : 0}-${activationHeight}`
    return await this.database.query(this.mapping.index.mandatory_index, {
      partitionKey: partitionKey,
      limit: Number.MAX_SAFE_INTEGER,
      order: SortOrder.ASC
    })
  }
}

@Injectable()
export abstract class DeferableDftxMapper<M extends DeferrableModel> {
  mapper?: BaseMapper<M>
  historyMapper?: HistoryMapper<M>
  deferredMapper?: DeferredMapper<DeferredModel<M>>

  abstract readonly modelMapping: ModelMapping<M>
  abstract readonly historyMapping?: ModelMapping<M>

  public constructor (
    protected readonly database: Database
  ) { }

  getMapper (): BaseMapper<M> {
    if (this.mapper === undefined) {
      this.mapper = new BaseMapper(this.database, this.modelMapping)
    }
    return this.mapper
  }

  getHistoryMapper (): HistoryMapper<M> {
    if (this.historyMapper === undefined) {
      this.historyMapper = new HistoryMapper(this.database, {
        type: `history_${this.modelMapping.type}`,
        index: {
          ...this.historyMapping?.index,
          mandatory_index: {
            name: `history_${this.modelMapping.type}_mandatory_index`,
            partition: {
              type: 'string',
              key: (h: M) => h.uniqueKey
            },
            sort: {
              type: 'string',
              key: (h: M) => {
                const actHeight = HexEncoder.encodeHeight(h.activationHeight)
                const setHeight = HexEncoder.encodeHeight(h.block.height)
                return `${actHeight}-${setHeight}`
              }
            }
          },
          mandatory_index_2: {
            name: `history_${this.modelMapping.type}_mandatory_index_2`,
            partition: {
              type: 'string',
              key: (h: M) => {
                const k = `${h.block.height}-${h.uniqueKey}`
                console.log('mandatory_index_2', k)
                return k
              }
            }
          },
          mandatory_index_3: {
            name: `history_${this.modelMapping.type}_mandatory_index_3`,
            partition: {
              type: 'string',
              key: (h: M) => h.id
            }
          }
        }
      })
    }
    return this.historyMapper
  }

  getDeferredMapper (): DeferredMapper<DeferredModel<M>> {
    if (this.deferredMapper === undefined) {
      this.deferredMapper = new DeferredMapper(this.database, {
        type: `deferred_${this.modelMapping.type}`,
        index: {
          mandatory_index: {
            name: `deferred_${this.modelMapping.type}_mandatory_index`,
            partition: {
              type: 'string',
              key: (dd: DeferredModel<DeferrableModel>) => `${dd.activated ? 1 : 0}-${dd.data.activationHeight}`
            },
            sort: {
              type: 'number',
              key: (dd: DeferredModel<DeferrableModel>) => dd.data.block.height
            }
          }
        }
      }) as any as DeferredMapper<DeferredModel<M>>
    }

    return this.deferredMapper
  }

  async getLastActivated (uniqueKey: string, currentHeight: number): Promise<M | undefined> {
    return await this.getHistoryMapper().getLastActivated(uniqueKey, currentHeight)
  }
}
