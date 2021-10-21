import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'
import { ApiPagedResponse } from '../whale.api.response'

export class LoanToken {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan tokens.
   *
   * @param {number} size of token to query
   * @param {string} next set of tokens
   * @return {Promise<ApiPagedResponse<LoanData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanData>> {
    return await this.client.requestList('GET', 'loans/tokens', size, next)
  }

  /**
   * Get information about a loan token with given loan token id.
   *
   * @param {string} id scheme id to get
   * @return {Promise<any>}
   */
  async get (id: string): Promise<any> {
    return await this.client.requestData('GET', `loans/tokens/${id}`)
  }
}

/**
 * Loans data.
 */

export interface LoanData {
  id: string
  priceFeedId: string
  interest: BigNumber
  tokenId: string
  symbol: string
  displaySymbol: string
  symbolKey: string
  name: string
  decimal: number
  limit: string
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  finalized: boolean
  minted: string
  creation: {
    tx: string
    height: number
  }
  destruction: {
    tx: string
    height: number
  }
  collateralAddress?: string
}
