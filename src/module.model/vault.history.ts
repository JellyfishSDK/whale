import { ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import { Vault } from './vault'
import { VaultState } from '@defichain/jellyfish-api-core/dist/category/loan'

const VaultHistoryMapping: ModelMapping<VaultHistory> = {
  type: 'vault',
  index: {
    vault_key_sort: {
      name: 'vault_key_sort',
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
    const latest = await this.database.query(VaultHistoryMapping.index.vault_key_sort, {
      partitionKey: vaultDepositId,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (vaultId: string, limit: number, lt?: string): Promise<VaultHistory[]> {
    return await this.database.query(VaultHistoryMapping.index.vault_key_sort, {
      partitionKey: vaultId,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async list (limit: number, lt?: string): Promise<VaultHistory[]> {
    return await this.database.query(VaultHistoryMapping.index.vault_key_sort, {
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

export interface VaultHistory extends Vault {
  id: string // ------------------| vaultId-height
  vaultId: string // -------------| as partition key
  sort: string // ----------------| hex encoded height

  loanSchemeId: string
  ownerAddress: string
  state: VaultState

  collateralAmounts: Array<{
    token: string
    currency: string // ----------------| stringified bignumber
  }>
  loanAmounts: Array<{
    token: string
    currency: string // ----------------| stringified bignumber
  }>
  interestAmounts: Array<{
    token: string
    currency: string // ----------------| stringified bignumber
  }>

  collateralValue: string // -----------| stringified bignumber
  loanValue: string // -----------------| stringified bignumber
  interestValue: string // -------------| stringified bignumber

  informativeRatio: string // ----------| stringified bignumber
  collateralRatio: number // -----------| stringified bignumber

  event: VaultHistoryEvent

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  from?: string // d | p | a
  to?: string // w | t | close
  index?: number // a
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
