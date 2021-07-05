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

export enum OracleState {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
