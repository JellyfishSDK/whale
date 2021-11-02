import { PaginationQuery } from '@src/module.api/_core/api.query'
import { VaultDetails, VaultPagination, VaultState } from '@defichain/jellyfish-api-core/dist/category/loan'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { LoanVault, LoanVaultState, LoanVaultTokenAmount } from '@whale-api-client/api/loan'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'

@Injectable()
export class LoanVaultService {
  constructor (
    private readonly client: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache
  ) {
  }

  async list (query: PaginationQuery, address?: string): Promise<ApiPagedResponse<LoanVault>> {
    const pagination: VaultPagination = {
      start: query.next !== undefined ? String(query.next) : undefined,
      // including_start: query.next === undefined,
      limit: query.size > 10 ? 10 : query.size // limit size to 10 for vault querying
    }

    const list = await this.client.loan.listVaults(pagination, { ownerAddress: address })
    const vaults = list.map(async ({ vaultId }) => {
      const vault = await this.client.loan.getVault(vaultId)
      return await this.mapLoanVault(vault)
    })

    const items = await Promise.all(vaults)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.vaultId
    })
  }

  async get (id: string): Promise<LoanVault> {
    try {
      const vault = await this.client.loan.getVault(id)
      return await this.mapLoanVault(vault)
    } catch (err) {
      if (err?.payload?.message === `Vault <${id}> not found` || err?.payload?.message === 'vaultId must be of length 64 (not 3, for \'999\')'
      ) {
        throw new NotFoundException('Unable to find vault')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  private async mapLoanVault (details: VaultDetails): Promise<LoanVault> {
    return {
      vaultId: details.vaultId,
      loanSchemeId: details.loanSchemeId,
      ownerAddress: details.ownerAddress,
      state: mapLoanVaultState(details.state),

      informativeRatio: details.informativeRatio?.toFixed(),
      collateralRatio: details.collateralRatio?.toFixed(),

      collateralValue: details.collateralValue?.toFixed(),
      loanValue: details.loanValue?.toFixed(),
      interestValue: details.interestValue?.toFixed(),

      collateralAmounts: await this.mapTokenAmount(details.collateralAmounts),
      loanAmounts: await this.mapTokenAmount(details.loanAmounts),
      interestAmounts: await this.mapTokenAmount(details.interestAmounts)
    }
  }

  private async mapTokenAmount (items?: string[]): Promise<LoanVaultTokenAmount[]> {
    if (items === undefined || items.length === 0) {
      return []
    }

    const tokenAmounts = items.map(value => value.split('@'))
    const tokenInfos = await this.deFiDCache
      .batchTokenInfoBySymbol(tokenAmounts.map(([_, symbol]) => symbol))

    return tokenAmounts
      .map(([amount, symbol]): LoanVaultTokenAmount => {
        const result = tokenInfos[symbol]
        if (result === undefined) {
          throw new ConflictException('unable to find token')
        }

        const info = Object.values(result)[0]
        const id = Object.keys(result)[0]

        return mapLoanVaultTokenAmount(id, info, amount)
      }).sort(a => Number.parseInt(a.id))
  }
}

function mapLoanVaultTokenAmount (id: string, tokenInfo: TokenInfo, amount: string): LoanVaultTokenAmount {
  return {
    id: id,
    amount: amount,
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    displaySymbol: tokenInfo.isDAT && tokenInfo.symbol !== 'DFI' && !tokenInfo.isLPS ? `d${tokenInfo.symbol}` : tokenInfo.symbol
  }
}

function mapLoanVaultState (state: VaultState): LoanVaultState {
  switch (state) {
    case VaultState.UNKNOWN:
      return LoanVaultState.UNKNOWN
    case VaultState.ACTIVE:
      return LoanVaultState.ACTIVE
    case VaultState.FROZEN:
      return LoanVaultState.FROZEN
    case VaultState.IN_LIQUIDATION:
      return LoanVaultState.IN_LIQUIDATION
    case VaultState.MAY_LIQUIDATE:
      return LoanVaultState.MAY_LIQUIDATE
  }
}
