import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'
import { CollateralTokenDetails } from '@defichain/jellyfish-api-core/dist/category/loan'
import { ApiPagedResponse } from '../whale.api.response'

export class LoanCollateral {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan collateral tokens.
   *
   * @param {number} size of collateral tokens to query
   * @param {string} next set of collateral tokens
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  async listCollateralTokens (size: number = 30, next?: string): Promise<ApiPagedResponse<CollateralTokenDetails>> {
    return await this.client.requestList('GET', 'loan/collaterals', size, next)
  }

  /**
   * Get information about a collateral token with given collateralToken id.
   *
   * @param {string} id collateralToken id to get
   * @return {Promise<CollateralTokenDetails>}
   */
  async getCollateralToken (id: string): Promise<CollateralTokenDetails> {
    return await this.client.requestData('GET', `loan/collaterals/${id}`)
  }
}

/**
 * Collateral data.
 */
export interface CollateralData {
  id: string
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock: BigNumber
}
