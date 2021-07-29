import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracles {
  constructor (private readonly client: WhaleApiClient) {
  }

  async listOracle (size: number = 30, next?: string): Promise<ApiPagedResponse<Oracle>> {
    return await this.client.requestList('GET', 'oracles', size, next)
  }

  async listOraclePrices (oracleId: string, size: number = 30, next?: string): Promise<ApiPagedResponse<OraclePriceFeed>> {
    return await this.client.requestList('GET', `oracles/${oracleId}/:key`, size, next)
  }

  async listPriceAggregated (token: string, currency: string, size: number = 30, next?: string): Promise<ApiPagedResponse<OraclePriceAggregated>> {
    return await this.client.requestList('GET', `prices/${token}-${currency}/aggregated`, size, next)
  }

  async listPriceOracles (token: string, currency: string, size: number = 30, next?: string): Promise<ApiPagedResponse<OracleTokenCurrency>> {
    return await this.client.requestList('GET', `prices/${token}-${currency}/oracles`, size, next)
  }
}

export interface Oracle {
  id: string

  weightage: number
  priceFeeds: Array<{
    token: string
    currency: string
  }>

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface OraclePriceFeed {
  id: string
  key: string
  sort: string

  token: string
  currency: string
  oracleId: string
  txid: string

  time: number
  amount: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface OraclePriceAggregated {
  id: string
  key: string
  sort: string

  token: string
  currency: string

  aggregated: {
    amount: string
    count: number
    weightage: number
  }

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface OracleTokenCurrency {
  id: string
  key: string

  token: string
  currency: string
  oracleId: string
  weightage: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
