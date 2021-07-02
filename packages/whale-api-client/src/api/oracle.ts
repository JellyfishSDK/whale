import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracle {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get current status of an oracle.
   *
   * @param {string} id oracleId
   * @return {Promise<OracleStatus>}
   */
  async getStatus (id: string): Promise<OracleStatus> {
    return await this.client.requestData('GET', `oracle/${id}/status`)
  }
}

export interface OracleStatus {
  id: string // oracleId - height
  block: {
    height: number
  }
  data: {
    weightage: number
  }
  state: OracleState
}

export enum OracleState {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
