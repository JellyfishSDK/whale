import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const VaultAuctionHistoryMapping: ModelMapping<VaultAuctionHistory> = {
  type: 'vault_auction_history',
  index: {
    vault_auction_history_key_sort: {
      name: 'vault_auction_history_key_sort',
      partition: {
        type: 'string',
        key: (vah: VaultAuctionHistory) => vah.key
      },
      sort: {
        type: 'string',
        key: (vah: VaultAuctionHistory) => vah.sort
      }
    }
  }
}

@Injectable()
export class VaultAuctionHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (key: string): Promise<VaultAuctionHistory | undefined> {
    const latest = await this.database.query(VaultAuctionHistoryMapping.index.vault_auction_history_key_sort, {
      partitionKey: key,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (key: string, limit: number, lt?: string): Promise<VaultAuctionHistory[]> {
    return await this.database.query(VaultAuctionHistoryMapping.index.vault_auction_history_key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<VaultAuctionHistory | undefined> {
    return await this.database.get(VaultAuctionHistoryMapping, id)
  }

  async put (vaultAuctionHistory: VaultAuctionHistory): Promise<void> {
    return await this.database.put(VaultAuctionHistoryMapping, vaultAuctionHistory)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultAuctionHistoryMapping, id)
  }
}

export interface VaultAuctionHistory extends Model {
  id: string // -----------------------| vaultId:batchIndex:txId
  key: string // ----------------------| vaultId:batchIndex
  sort: string // ---------------------| hex encoded height

  vaultId: string
  index: number
  from: string
  amount: {
    token: string // ------------------| stringified bignumber
    currency: string
  }

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
