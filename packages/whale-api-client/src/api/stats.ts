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

}
