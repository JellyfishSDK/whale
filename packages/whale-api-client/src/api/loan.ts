import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'
import { TokenData } from './tokens'
import { ApiPagedResponse } from '../whale.api.response'

export class Loan {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan tokens.
   *
   * @param {number} size of token to query
   * @param {string} next set of tokens
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  async listLoanTokens (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanData>> {
    return await this.client.requestList('GET', 'loan/tokens', size, next)
  }
}

/**
 * Loans.
 */

export interface Loan {
  id: string
  priceFeedId: string
  interest: BigNumber
  tokenId: string
  tokenData: TokenData
}

/**
 * Loans data.
 */

export interface LoanData {
  id: string
  priceFeedId: string
  interest: BigNumber
  tokenId: string
  symbol: string | undefined
  displaySymbol: string | undefined
  symbolKey: string | undefined
  name: string | undefined
  decimal: number | undefined
  limit: string | undefined
  mintable: boolean | undefined
  tradeable: boolean | undefined
  isDAT: boolean | undefined
  isLPS: boolean | undefined
  finalized: boolean | undefined
  minted: string | undefined
  creation: {
    tx: string | undefined
    height: number | undefined
  }
  destruction: {
    tx: string | undefined
    height: number | undefined
  }
  collateralAddress?: string | undefined
}
