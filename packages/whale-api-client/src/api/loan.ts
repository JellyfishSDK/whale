import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { LoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'

export class Loan {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get list of loan schemes.
   *
   * @param {number} size scheme size to query
   * @param {string} next  set of scheme to get
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  async listSchemes (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanSchemeResult>> {
    return await this.client.requestList('GET', 'loan/schemes', size, next)
  }

  /**
   * Get information about a scheme with given id.
   *
   * @param {string} id scheme id to get
   * @return {Promise<LoanSchemeResult>}
   */
  async getScheme (id: string): Promise<LoanSchemeResult> {
    return await this.client.requestData('GET', `loan/schemes/${id}`)
  }
}
