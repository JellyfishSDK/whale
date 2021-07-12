import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'

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
   * @return {Promise<OracleAppointedWeightage>}
   */
  async getStatus (id: string): Promise<OracleAppointedWeightage> {
    return await this.client.requestData('GET', `oracle/${id}/status`)
  }

  /**
   * Get price Feed for an oracleId
   *
   * @param {string} id oracleId
   * @return {Promise<OracleAppointedTokenCurrency>}
   */
  async getPriceFeed (id: string): Promise<OracleAppointedTokenCurrency[]> {
    return await this.client.requestData('GET', `oracle/${id}/priceFeed`)
  }

  /**
   * Get all price feeds
   *
   * @return {Promise<OracleAppointedTokenCurrency>}
   */
  async getPriceFeeds (): Promise<OracleAppointedTokenCurrency[]> {
    return await this.client.requestData('GET', 'oracle/priceFeeds')
  }

  /**
   * Get price data for an oracleId
   *
   * @param {string} id oracleId
   * @return {Promise<OraclePriceData>}
   */
  async getPriceData (id: string): Promise<OraclePriceData[]> {
    return await this.client.requestData('GET', `oracle/${id}/priceData`)
  }

  /**
   * Get price for a token and currency
   *
   * @param {string} token
   * @param {string} currency
   * @return {Promise<OraclePriceAggregration>}
   */
  async getPrice (token: string, currency: string): Promise<OraclePriceAggregration> {
    return await this.client.requestData('GET', `oracle/${token}/${currency}/price`)
  }

  /**
   * Get price for a token and currency at a specific timestamp
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
   * Get percentage price change based on 2 timestamps
   *
   * @param {string} token
   * @param {string} currency
   * @param {number} timestamp1
   * @param {number} timestamp2
   * @return {Promise<BigNumber>}
   */
  async getPricePercentageChange (token: string, currency: string, timestamp1: number, timestamp2: number): Promise<BigNumber> {
    return await this.client.requestData('GET', `oracle/${token}/${currency}/${timestamp1}/${timestamp2}/percentagePriceChange`)
  }

  /**
   * Returns prices interval across a time range.
   *
   * @param {string} token
   * @param {string} currency
   * @param {number} timestamp1
   * @param {number} timestamp2
   * @param {number} interval
   * @return {Promise<BigNumber>}
   */
  async getPricesInterval (token: string, currency: string, timestamp1: number, timestamp2: number, interval: number): Promise<BigNumber> {
    return await this.client.requestData('GET', `oracle/${token}/${currency}/${timestamp1}/${timestamp2}/${interval}/pricesInterval`)
  }
}

export interface OracleAppointedWeightage {
  id: string
  block: {
    height: number
  }
  data: {
    oracleId: string
    weightage: number
  }
  state: OracleState
}

export interface OracleAppointedTokenCurrency {
  id: string
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
    oracleId: string
    token: string
    currency: string
    amount: number
    timestamp: number
  }
  state: OracleState
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
    amount: number
  }
}

export enum OracleState {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
