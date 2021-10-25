import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'
import { ApiPagedResponse } from '../whale.api.response'
import { LoanTokenDetails } from '@defichain/jellyfish-api-core/dist/category/loan'

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
   * @return {Promise<LoanTokenDetails>}
   */
  async get (id: string): Promise<LoanTokenDetails> {
    return await this.client.requestData('GET', `loans/tokens/${id}`)
  }
}

/**
 * Loan token data.
 */
export interface LoanData {
  symbol: string
  token: LoanTokenDetails
  interest: BigNumber
  fixedIntervalPriceId: string
}
