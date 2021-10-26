import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { LoanTokenResult } from '@defichain/jellyfish-api-core/dist/category/loan'
import BigNumber from 'bignumber.js'
import { TokenResult } from '@defichain/jellyfish-api-core/dist/category/token'

export class Loan {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan schemes.
   *
   * @param {number} size of scheme to query
   * @param {string} next set of schemes
   * @return {Promise<ApiPagedResponse<LoanScheme>>}
   */
  async listScheme (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanScheme>> {
    return await this.client.requestList('GET', 'loans/schemes', size, next)
  }

  /**
   * Get information about a scheme with given scheme id.
   *
   * @param {string} id scheme id to get
   * @return {Promise<LoanScheme>}
   */
  async getScheme (id: string): Promise<LoanScheme> {
    return await this.client.requestData('GET', `loans/schemes/${id}`)
  }

  /**
   * Paginate query loan collateral tokens.
   *
   * @param {number} size of collateral tokens to query
   * @param {string} next set of collateral tokens
   * @return {Promise<ApiPagedResponse<CollateralToken>>}
   */
  async listCollateral (size: number = 30, next?: string): Promise<ApiPagedResponse<CollateralToken>> {
    return await this.client.requestList('GET', 'loans/collaterals', size, next)
  }

  /**
   * Get information about a collateral token with given collateral token id.
   *
   * @param {string} id collateralToken id to get
   * @return {Promise<CollateralToken>}
   */
  async getCollateral (id: string): Promise<CollateralToken> {
    return await this.client.requestData('GET', `loans/collaterals/${id}`)
  }

  /**
   * Paginate query loan tokens.
   *
   * @param {number} size of loan token to query
   * @param {string} next set of loan tokens
   * @return {Promise<ApiPagedResponse<LoanToken>>}
   */
  async listLoanToken (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanToken>> {
    return await this.client.requestList('GET', 'loans/tokens', size, next)
  }

  /**
   * Get information about a loan token with given loan token id.
   *
   * @param {string} id loanToken id to get
   * @return {Promise<LoanTokenResult>}
   */
  async getLoanToken (id: string): Promise<LoanTokenResult> {
    return await this.client.requestData('GET', `loans/tokens/${id}`)
  }
}

export interface LoanScheme {
  id: string
  minColRatio: string
  interestRate: string
}

export interface CollateralToken {
  tokenId: string
  token: string
  factor: string
  priceFeedId: string
  activateAfterBlock: number
}

export interface LoanToken {
  tokenId: string
  token: TokenResult
  interest: BigNumber
  fixedIntervalPriceId: string
}
