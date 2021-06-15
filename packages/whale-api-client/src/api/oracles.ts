import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import BigNumber from 'bignumber.js'
import { OraclePriceFeed } from '@defichain/jellyfish-api-core/dist/category/oracle'

export class Oracles {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query oracles.
   *
   * @param {number} size of oracles to query
   * @param {number} next set of oracles
   * @return {Promise<ApiPagedResponse<OracleData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<OracleData>> {
    return await this.client.requestList('GET', 'oracles', size, next)
  }

  /**
   * Get information about a oracle with oracleid.
   *
   * @param {string} id
   * @return {Promise<OracleData>}
   */
  async get (id: string): Promise<OracleData> {
    return await this.client.requestData('GET', `oracles/${id}`)
  }

  /**
   * Paginate query oracle latest raw prices.
   *
   * @param {number} size of oracles to query
   * @param {number} next set of oracles
   * @return {Promise<ApiPagedResponse<OracleData>>}
   */
  async latestRawPrices (size: number = 30, next?: string): Promise<ApiPagedResponse<OracleRawPrice>> {
    return await this.client.requestList('GET', 'oracles/rawLatestPrices', size, next)
  }

  /**
   * Paginate query oracle prices.
   *
   * @param {number} size of oracles to query
   * @param {number} next set of oracles
   * @return {Promise<ApiPagedResponse<ListPricesData>>}
   */
  async listPrices (size: number = 30, next?: string): Promise<ApiPagedResponse<ListPricesData[]>> {
    return await this.client.requestList('GET', 'oracles/prices', size, next)
  }

  /**
   * Get the oracle price with id of the oracle.
   *
   * @param {string} token
   * @param {string} currency
   * @return {Promise<string>}
   */
  async getPrice (token: string, currency: string): Promise<string> {
    return await this.client.requestData('GET', `oracles/price/${token}/${currency}`)
  }
}

// Once test containers updated and includes all the RPCS, the following code will be removed
export enum OracleRawPriceState {
  // LIVE = 'live',
  EXPIRED = 'expired'
}

export interface OracleRawPrice {
  oracleid: string
  priceFeeds: OraclePriceFeed
  rawprice: BigNumber
  weightage: BigNumber
  state: OracleRawPriceState
  timestamp: BigNumber
}

export interface ListPricesData {
  token: string
  currency: string
  price?: BigNumber
  ok: boolean | string
}

export interface OracleData {
  oracleid: string
  address: string
  priceFeeds: OraclePriceFeed[]
  tokenPrices: OracleTokenPrice[]
  weightage: number
}

export interface OracleTokenPrice {
  token: string
  currency: string
  amount: number
  timestamp: number
}
