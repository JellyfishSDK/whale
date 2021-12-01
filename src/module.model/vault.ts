import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const VaultMapping: ModelMapping<Vault> = {
  type: 'vault',
  index: {
    vault_id: {
      name: 'vault_vault_id',
      partition: {
        type: 'string',
        key: (b: Vault) => b.id
      }
    }
  }
}

@Injectable()
export class VaultMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<Vault[]> {
    return await this.database.query(VaultMapping.index.oracle_id, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Vault | undefined> {
    return await this.database.get(VaultMapping, id)
  }

  async put (oracle: Vault): Promise<void> {
    return await this.database.put(VaultMapping, oracle)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultMapping, id)
  }
}

export enum LoanVaultState {
  UNKNOWN = 'UNKNOWN',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  IN_LIQUIDATION = 'IN_LIQUIDATION',
  MAY_LIQUIDATE = 'MAY_LIQUIDATE'
}

export interface Vault extends Model {
  id: string // ---------| vaultId
  ownerAddress: string
  schemeId: string
  state: LoanVaultState

  collateralAmounts: Array<{
    token: string
    amount: string
  }>
  loanAmounts: Array<{
    token: string
    amount: string
  }>
  interestAmounts: Array<{
    token: string
    amount: string
  }>

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
