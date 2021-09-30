import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for anchors related services.
 */

export class Anchors {
  constructor (private readonly client: WhaleApiClient) {}

  /**
   * Paginate query anchors.
   *
   * @param {number} size of anchors to query
   * @param {string} next set of anchors
   * @return {Promise<ApiPagedResponse<AnchorData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<AnchorData>> {
    return await this.client.requestList('GET', 'anchors', size, next)
  }
}

export interface AnchorData {
  id: string
  btc: {
    block: {
      height: number
      hash: string
    }
    txn: {
      hash: string
    }
    confirmations: number
  }
  dfi: {
    block: {
      height: number
      hash: string
    }
  }
  previousAnchor: string
  rewardAddress: string
  signatures: number
  active?: boolean
  anchorCreationHeight?: number
}
