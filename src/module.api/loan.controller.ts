import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ListVaultOptions, VaultPagination } from '@defichain/jellyfish-api-core/dist/category/loan'
import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

@Controller('/loan')
export class LoanController {
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
  @Get('/vaults/:owneraddress/:loanschemeId/:isunderliquidation')
  async list (
    container: MasterNodeRegTestContainer,
    @Query() query: PaginationQuery,
    @Param('owneraddress') ownerAddress?: string,
    @Param('loanschemeId') loanSchemeId?: string,
    @Param('isunderliquidation') isUnderLiquidation?: boolean
  ): Promise<any> {
    const options: ListVaultOptions = {
      ownerAddress,
      loanSchemeId,
      isUnderLiquidation
    }

    const pagination: VaultPagination = {
      start: query.next !== undefined ? String(query.next) : undefined,
      including_start: query.next === undefined,
      limit: query.size
    }

    const data: VaultDetails = await container.call('listvaults', [
      options, pagination
    ])

    const vaults: any[] = Object.entries(data)
      .map(([id, value]): Vault => {
        return value
      })
      .sort((a, b) => a.ownerAddress.localeCompare(b.ownerAddress))
    return ApiPagedResponse.of(vaults, query.size, item => {
      return item.ownerAddress
    })
  }

  /**
   * Get information about a vault with vault id.
   *
   * @param {string} id
   * @return {Promise<VaultDetails>}
   */
  @Get('/vault/:id')
  async get (@Param('id') id: string): Promise<VaultDetails> {
    try {
      return await this.client.loan.getVault(id)
    } catch (err) {
      console.log(err?.payload?.message)
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
