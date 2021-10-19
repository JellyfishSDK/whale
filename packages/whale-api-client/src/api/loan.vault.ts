import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { VaultDetails } from '@defichain/jellyfish-api-core/dist/category/loan'

export class LoanVault {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan vaults.
   *
   * @param {number} size of vaults to query
   * @param {string} next set of vaults
   * @param {string} ownerAddress
   * @param {string} loanSchemeId
   * @param {boolean} isUnderLiquidation
   * @return {Promise<ApiPagedResponse<VaultDetails>>}
   */
  async list (ownerAddress: string, loanSchemeId: string, isUnderLiquidation: string, size: number = 30, next?: string): Promise<ApiPagedResponse<VaultDetails>> {
    return await this.client.requestList('GET', `loans/vaults/${ownerAddress}/${loanSchemeId}/${isUnderLiquidation}`, size, next)
  }

  /**
   * Get information about a vault with given vault id.
   *
   * @param {string} id vault id to get
   * @return {Promise<VaultDetails>}
   */
  async get (id: string): Promise<VaultDetails> {
    return await this.client.requestData('GET', `loans/vaults/${id}`)
  }
}
