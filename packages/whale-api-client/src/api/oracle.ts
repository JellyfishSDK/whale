import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracle {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * list all token currencies.
   *
   * @param {number} size
   * @param {string} next
   * @return {Promise<ApiPagedResponse<OracleTokenCurrency>>}
   */
  async listTokenCurrencies (size: number = 50, next?: string): Promise<ApiPagedResponse<OracleTokenCurrency>> {
    return await this.client.requestList('GET', 'oracle/token/currency', size, next)
  }

  /**
   * Get all token currencies of an oracle.
   *
   * @param {string} id oracleId
   * @param {number} size
   * @param {string} next
   * @return {Promise<ApiPagedResponse<OracleTokenCurrency>>}
   */
  async getTokenCurrencies (id: string, size: number = 50, next?: string): Promise<ApiPagedResponse<OracleTokenCurrency>> {
    return await this.client.requestList('GET', `oracle/${id}/token/currency`, size, next)
  }

  /**
   * Get price data of an oracle.
   *
   * @param {string} id oracleId
   * @param {number} size
   * @param {string} next
   * @return {Promise<ApiPagedResponse<OraclePriceData>>}
   */
  async getPriceData (id: string, size: number = 50, next?: string): Promise<ApiPagedResponse<OraclePriceData>> {
    return await this.client.requestList('GET', `oracle/${id}/price/data`, size, next)
  }

  /**
   * Get current price of a token currency.
   *
   * @param {string} token
   * @param {string} currency
   * @return {Promise<OraclePriceAggregration>}
   */
  async getPrice (token: string, currency: string): Promise<OraclePriceAggregration> {
    return await this.client.requestData('GET', `oracle/${token}/${currency}/price`)
  }

  /**
   * Get price of a token currency at a specific timestamp.
   *
   * @param {string} token
   * @param {string} currency
   * @param {number} timestamp
   * @return {Promise<OraclePriceAggregration>}
   */
  async getPriceByTimestamp (token: string, currency: string, timestamp: number): Promise<OraclePriceAggregration> {
    return await this.client.requestData('GET', `oracle/${token}/${currency}/${timestamp}/price`)
  }

  /**
   * Get prices of all time intervals between 2 timestamps.
   *
   * @param {string} token
   * @param {string} currency
   * @param {number} timestamp1
   * @param {number} timestamp2
   * @param {number} timeInterval
   * @param {number} size
   * @param {string} next
   * @return {Promise<ApiPagedResponse<OraclePriceInterval>>}
   */
  async getIntervalPrice (token: string, currency: string, timestamp1: number, timestamp2: number, timeInterval: number, size: number = 50, next?: string): Promise<ApiPagedResponse<OraclePriceInterval>> {
    return await this.client.requestList('GET', `oracle/${token}/${currency}/${timestamp1}/${timestamp2}/${timeInterval}/price/interval`, size, next)
  }
}

export interface OracleAppointed {
  id: string
  block: {
    height: number
  }
  data: {
    oracleId: string
    weightage: number
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
    oracleId: string
    token: string
    currency: string
    amount: BigNumber
    timestamp: number
  }
}

export interface OraclePriceAggregration {
  id: string
  block: {
    height: number
    time: number
  }
  data: {
    token: string
    currency: string
    amount: BigNumber
  }
}

export interface OracleTokenCurrency {
  token: string
  currency: string
}

export interface OraclePriceInterval {
  timestamp: number
  amount: BigNumber
}

export enum OracleState {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
