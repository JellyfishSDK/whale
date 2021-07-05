import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracle {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get current status of an oracle
   *
   * @param {string} id oracleId
   * @return {Promise<OracleAppointed>}
   */
  async getStatus (id: string): Promise<OracleAppointed> {
    return await this.client.requestData('GET', `oracle/${id}/status`)
  }

  /**
   * Get price Feed for an oracleId
   *
   * @param {string} id oracleId
   * @return {Promise<OraclePriceFeed>}
   */
  async getPriceFeedById (id: string): Promise<OraclePriceFeed[]> {
    return await this.client.requestData('GET', `oracle/${id}/priceFeed`)
  }

  /**
   * Get all price feeds
   *
   * @return {Promise<OraclePriceFeed>}
   */
  async getAll (): Promise<OraclePriceFeed[]> {
    return await this.client.requestData('GET', 'oracle/pricefeed')
  }
}

export interface OracleAppointed {
  id: string // oracleId - height
  block: {
    height: number
  }
  data: {
    oracleId: string
    weightage: number
  }
  state: OracleState
}

export interface OraclePriceFeed {
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

export interface OraclePriceData {
  id: string
  block: {
    height: number
  }
  data: {
    timestamp: number
    token: string
    currency: string
    oracleId: string
    amount: number
  }
  state: OracleState
}

export enum OracleState {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
