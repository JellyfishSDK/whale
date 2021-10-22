import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { VaultDetails, VaultPagination } from '@defichain/jellyfish-api-core/dist/category/loan'

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
  @Get('/:owneraddress/:loanschemeid/:isunderliquidation')
  async list (
    @Param('owneraddress') ownerAddress: string | undefined,
      @Param('loanschemeid') loanSchemeId: string | undefined,
      @Param('isunderliquidation') isUnderLiquidation: boolean,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<VaultDetails>> {
    const pagination: VaultPagination = {
      start: query.next !== undefined ? String(query.next) : undefined,
      // including_start: query.next === undefined,
      limit: query.size
    }

    if (ownerAddress === '') ownerAddress = undefined
    if (loanSchemeId === '') loanSchemeId = undefined

    const vaults = await this.client.loan.listVaults(
      pagination,
      { ownerAddress, loanSchemeId, isUnderLiquidation }
    )

    return ApiPagedResponse.of(vaults, query.size, item => {
      return item.vaultId
    })
  }

  /**
   * Get information about a vault with given vault id.
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
