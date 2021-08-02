import { WhaleApiClient } from '../whale.api.client'

export class Stats {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get stats of DeFi Blockchain
   *
   * @return {Promise<StatsData>}
   */
  async get (): Promise<StatsData> {
    return await this.client.requestData('GET', `stats`)
  }
}

export interface StatsData {
  count: {
    blocks: number
    tokens: number
    prices: number
    masternodes: number
  }
  tvl: {
    total: number
    dex: number
    masternode: number
  }
  burned: {
    total: number
    fee: number
    emission: number
    address: number
  }
  price: {
    usdt: number
  }
}
