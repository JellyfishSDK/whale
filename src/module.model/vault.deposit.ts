import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import BigNumber from 'bignumber.js'

const VaultDepositMapping: ModelMapping<VaultDeposit> = {
  type: 'vault_deposit',
  index: {
    vault_deposit_key_sort: {
      name: 'vault_deposit_key_sort',
      partition: {
        type: 'string',
        key: (vd: VaultDeposit) => vd.vaultId
      },
      sort: {
        type: 'string',
        key: (vd: VaultDeposit) => vd.sort
      }
    }
  }
}

@Injectable()
export class VaultDepositMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (vaultDepositId: string): Promise<VaultDeposit | undefined> {
    const latest = await this.database.query(VaultDepositMapping.index.vault_deposit_key_sort, {
      partitionKey: vaultDepositId,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (vaultId: string, limit: number, lt?: string): Promise<VaultDeposit[]> {
    return await this.database.query(VaultDepositMapping.index.vault_deposit_key_sort, {
      partitionKey: vaultId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async list (limit: number, lt?: string): Promise<VaultDeposit[]> {
    return await this.database.query(VaultDepositMapping.index.vault_deposit_key_sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<VaultDeposit | undefined> {
    return await this.database.get(VaultDepositMapping, id)
  }

  async put (vaultDeposit: VaultDeposit): Promise<void> {
    return await this.database.put(VaultDepositMapping, vaultDeposit)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultDepositMapping, id)
  }
}

export interface VaultDeposit extends Model {
  id: string // -------------| vaultId-height
  vaultId: string // --------| as partition key
  sort: string // -----------| Hex encoded height
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
  ownerAddress: string
  tokenAmount: BigNumber
  symbol: string
}

export interface Vault extends Model {
  id: string // vaultId

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface VaultHistory extends Model {
  id: string // vaultId-height

  vaultId: string // key
  sort: string // height

  event: string // create | update | close | deposit | withdraw | takeLoan | payback | auctionBid
  ownerAddress?: string // create | u
  loanSchemeId?: string // create | u
  from?: string // d | p | a
  to?: string // w | t | close
  amounts?: Array<{ // d | w | a | t | p
    token: string
    symbol: string
  }>
  index?: number // a

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
