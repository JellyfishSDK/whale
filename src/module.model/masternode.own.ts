import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const MasternodeOwnMapping: ModelMapping<MasternodeOwn> = {
  type: 'masternode_own_aggregation',
  index: {
    owneraddress_height: {
      name: 'masternode_own_aggregation_owneraddress_height',
      partition: {
        type: 'string',
        key: (b: MasternodeOwn) => b.ownerAddress
      },
      sort: {
        type: 'number',
        key: (b: MasternodeOwn) => b.block.height
      }
    }
  }
}

@Injectable()
export class MasternodeOwnMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (ownerAddress: string): Promise<MasternodeOwn | undefined> {
    const aggregations = await this.database.query(MasternodeOwnMapping.index.owneraddress_height, {
      partitionKey: ownerAddress,
      order: SortOrder.DESC,
      limit: 1
    })
    return aggregations.length === 0 ? undefined : aggregations[0]
  }

  async query (ownerAddress: string, limit: number, lt?: string): Promise<MasternodeOwn[]> {
    return await this.database.query(MasternodeOwnMapping.index.owneraddress_height, {
      partitionKey: ownerAddress,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<MasternodeOwn | undefined> {
    return await this.database.get(MasternodeOwnMapping, id)
  }

  async put (masternodeOwn: MasternodeOwn): Promise<void> {
    return await this.database.put(MasternodeOwnMapping, masternodeOwn)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(MasternodeOwnMapping, id)
  }
}

export interface MasternodeOwn extends Model {
  id: string // masternodeId
  ownerAddress: string // partition
  operatorAddress: string
  creationHeight: number
  resignHeight: number
  resignTx?: string
  mintedBlocks: number
  timelock: number // number of weeks locked up
  local: boolean

  block: {
    hash: string
    height: number // sort
    time: number
    medianTime: number
  }
}
