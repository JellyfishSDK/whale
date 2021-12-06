import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'
import { VaultState } from '@defichain/jellyfish-api-core/dist/category/loan'

const VaultMapping: ModelMapping<Vault> = {
  type: 'vault',
  index: {
    vault_id: {
      name: 'vault_id',
      partition: {
        type: 'string',
        key: (v: Vault) => v.sort
      }
    }
  }
}

@Injectable()
export class VaultMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (): Promise<Vault | undefined> {
    const latest = await this.database.query(VaultMapping.index.vault_id, {
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (limit: number, lt?: string): Promise<Vault[]> {
    return await this.database.query(VaultMapping.index.vault_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async list (limit: number, lt?: string): Promise<Vault[]> {
    return await this.database.query(VaultMapping.index.vault_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Vault | undefined> {
    return await this.database.get(VaultMapping, id)
  }

  async put (vaultDeposit: Vault): Promise<void> {
    return await this.database.put(VaultMapping, vaultDeposit)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultMapping, id)
  }
}

export interface Vault extends Model {
  id: string // -----------------------| vaultId
  sort: string // ---------------------| hex encoded height

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

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
