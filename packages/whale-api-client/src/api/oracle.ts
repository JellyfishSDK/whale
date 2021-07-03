import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracle {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get current priceFeed
   *
   * @param {string} id oracleId
   * @return {Promise<OraclePriceFeed>}
   */
  async getPriceFeedById (id: string): Promise<OraclePriceFeed[]> {
    return await this.client.requestData('GET', `oracle/${id}/priceFeed`)
  }
}

export interface OraclePriceFeed{
  id: string // oracleId_token_currency-height
  block: {
    height: number
  }
  data: {
    oracleId: string
    token: string
    currency: string
  }
  state: OracleState
}

export enum OracleState {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
