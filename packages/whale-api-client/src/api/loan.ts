import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { LoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'

export class Loan {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan schemes.
   *
   * @param {number} size of scheme to query
   * @param {string} next set of schemes
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanSchemeResult>> {
    return await this.client.requestList('GET', 'loans/schemes', size, next)
  }

  /**
   * Get information about a scheme with given scheme id.
   *
   * @param {string} id scheme id to get
   * @return {Promise<LoanSchemeResult>}
   */
  async get (id: string): Promise<LoanSchemeResult> {
    return await this.client.requestData('GET', `loans/schemes/${id}`)
  }
}
