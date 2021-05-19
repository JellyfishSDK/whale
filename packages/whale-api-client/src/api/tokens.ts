import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

export class Tokens {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Returns information about tokens.
   *
   * @param {number} size of tokens to query
   * @param {number} next set of tokens
   * @return {Promise<ApiPagedResponse<TokenInfo>>}
   */
  async get (size: number = 30, next?: string): Promise<ApiPagedResponse<TokenInfo>> {
    return await this.client.requestList('GET', 'tokens', size, next)
  }

  /**
   * Returns information about tokens.
   *
   * @param {string} id id/symbol/creationTx
   * @return {Promise<TokenInfo>}
   */
  async getId (id: string): Promise<TokenInfo> {
    return await this.client.requestData('GET', `tokens/${id}`)
  }
}
