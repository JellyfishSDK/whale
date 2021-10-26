import { PaginationQuery } from '@src/module.api/_core/api.query'
import { VaultDetails, VaultPagination } from '@defichain/jellyfish-api-core/dist/category/loan'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { LoanVault, LoanVaultTokenAmount } from '@whale-api-client/api/loan'
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
      limit: query.size
    }

    const vaults = (await this.client.loan.listVaults(pagination, { ownerAddress: address }))
      .map(async value => await this.mapLoanVault(value))
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
      invalidPrice: details.invalidPrice,
      isUnderLiquidation: details.isUnderLiquidation,

      collateralValue: details.collateralValue?.toFixed(),
      loanValue: details.loanValue?.toFixed(),
      currentRatio: details.currentRatio?.toFixed(),
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
