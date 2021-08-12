import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const MasternodeMapping: ModelMapping<Masternode> = {
  type: 'masternode',
  index: {
    masternode_id: {
      name: 'masternode_masternode_id',
      partition: {
        type: 'string',
        key: (b: Masternode) => b.id
      }
    }
  }
}

@Injectable()
export class MasternodeMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<Masternode[]> {
    return await this.database.query(MasternodeMapping.index.oracle_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Masternode | undefined> {
    return await this.database.get(MasternodeMapping, id)
  }

  async put (masternode: Masternode): Promise<void> {
    return await this.database.put(MasternodeMapping, masternode)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(MasternodeMapping, id)
  }
}

export interface Masternode extends Model {
  id: string // ---------| masternodeId

  ownerAddress: string
  operatorAddress: string
  creationHeight: number
  resignHeight: number
  mintedBlocks: number
  timelock: number // number of weeks locked up
  state: 'ENABLED' | 'PRE_ENABLED' | 'RESIGNED' | 'PRE_RESIGNED' | 'UNKNOWN'

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
