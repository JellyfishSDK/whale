import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { VaultPagination } from '@defichain/jellyfish-api-core/dist/category/loan'
import BigNumber from 'bignumber.js'

@Controller('/loans/vaults')
export class LoanVaultController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate loan vaults.
   *
   * @param {PaginationQuery} query
   * @param ownerAddress
   * @param loanSchemeId
   * @param isUnderLiquidation
   * @return {Promise<ApiPagedResponse<VaultDetails>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<VaultDetails>> {
    const pagination: VaultPagination = {
      start: query.next !== undefined ? String(query.next) : undefined,
      limit: query.size
    }

    const vaults = await this.client.loan.listVaults(
      pagination,
      {}
    )

    return ApiPagedResponse.of(vaults, query.size, item => {
      return item.vaultId
    })
  }

  /**
   * Get information about a vault with vault id.
   *
   * @param {string} id
   * @return {Promise<VaultDetails>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<VaultDetails> {
    try {
      return await this.client.loan.getVault(id)
    } catch (err) {
      if (err?.payload?.message === `Vault <${id}> not found` ||
          err?.payload?.message === 'vaultId must be of length 64 (not 3, for \'999\')'
      ) {
        throw new NotFoundException('Unable to find vault')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}

// function mapVaultData (
//   vault: Vault
// ): any {
//   return {
//     vaultId: vault.vaultId,
//     ownerAddress: vault.ownerAddress,
//     loanSchemeId: vault.loanSchemeId,
//     isUnderLiquidation: vault.isUnderLiquidation
//   }
// }

export interface Vault {
  id: string
  vaultId: string
  ownerAddress: string
  loanSchemeId: string
  isUnderLiquidation: boolean
}

export interface VaultDetails {
  vaultId: string
  loanSchemeId: string
  ownerAddress: string
  isUnderLiquidation: boolean
  batches?: AuctionBatchDetails[]
  collateralAmounts?: string[]
  loanAmount?: string[]
  collateralValue?: BigNumber
  loanValue?: BigNumber
  currentRatio?: BigNumber
}

export interface AuctionBatchDetails {
  index: BigNumber
  collaterals: string[]
  loan: string
}
