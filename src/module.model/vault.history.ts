import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const VaultHistoryMapping: ModelMapping<VaultHistory> = {
  type: 'vault_deposit',
  index: {
    vault_deposit_key_sort: {
      name: 'vault_deposit_key_sort',
      partition: {
        type: 'string',
        key: (vd: VaultHistory) => vd.vaultId
      },
      sort: {
        type: 'string',
        key: (vd: VaultHistory) => vd.sort
      }
    }
  }
}

@Injectable()
export class VaultHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (vaultDepositId: string): Promise<VaultHistory | undefined> {
    const latest = await this.database.query(VaultHistoryMapping.index.vault_deposit_key_sort, {
      partitionKey: vaultDepositId,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (vaultId: string, limit: number, lt?: string): Promise<VaultHistory[]> {
    return await this.database.query(VaultHistoryMapping.index.vault_deposit_key_sort, {
      partitionKey: vaultId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async list (limit: number, lt?: string): Promise<VaultHistory[]> {
    return await this.database.query(VaultHistoryMapping.index.vault_deposit_key_sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<VaultHistory | undefined> {
    return await this.database.get(VaultHistoryMapping, id)
  }

  async put (vaultDeposit: VaultHistory): Promise<void> {
    return await this.database.put(VaultHistoryMapping, vaultDeposit)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultHistoryMapping, id)
  }
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
  id: string // --------------| vaultId-height

  vaultId: string // ---------| as partition key
  sort: string // ------------| hex encoded height

  event: VaultHistoryEvent
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

export enum VaultHistoryEvent {
  CREATE = 'create',
  UPDATE = 'update',
  CLOSE = 'close',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TAKE_LOAN = 'takeLoan',
  PAYBACK = 'payback',
  BID = 'bid'
}
