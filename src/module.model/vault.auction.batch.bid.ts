import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const VaultAuctionBatchBidMapping: ModelMapping<VaultAuctionBatchBid> = {
  type: 'vault_auction_batch_bidder',
  index: {
    id: {
      name: 'vault_auction_batch_bid_id',
      partition: {
        type: 'string',
        key: (vabb: VaultAuctionBatchBid) => vabb.id
      }
    }
  }
}

@Injectable()
export class VaultAuctionBatchBidMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (): Promise<VaultAuctionBatchBid | undefined> {
    const latest = await this.database.query(VaultAuctionBatchBidMapping.index.id, {
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (limit: number, lt?: string): Promise<VaultAuctionBatchBid[]> {
    return await this.database.query(VaultAuctionBatchBidMapping.index.id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<VaultAuctionBatchBid | undefined> {
    return await this.database.get(VaultAuctionBatchBidMapping, id)
  }

  async put (vaultAuctionBatchBid: VaultAuctionBatchBid): Promise<void> {
    return await this.database.put(VaultAuctionBatchBidMapping, vaultAuctionBatchBid)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultAuctionBatchBidMapping, id)
  }
}

export interface VaultAuctionBatchBid extends Model {
  id: string // -------------| vaultId-batchIndex
  froms: string[]
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
