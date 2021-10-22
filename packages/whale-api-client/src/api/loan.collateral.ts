import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'
import { ApiPagedResponse } from '../whale.api.response'

export class LoanCollateral {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan collateral tokens.
   *
   * @param {number} size of collateral tokens to query
   * @param {string} next set of collateral tokens
   * @return {Promise<ApiPagedResponse<CollateralData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<CollateralData>> {
    return await this.client.requestList('GET', 'loans/collaterals', size, next)
  }

  /**
   * Get information about a collateral token with given collateralToken id.
   *
   * @param {string} id collateralToken id to get
   * @return {Promise<CollateralData>}
   */
  async get (id: string): Promise<CollateralData> {
    return await this.client.requestData('GET', `loans/collaterals/${id}`)
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
