import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for poolpair related services.
 */

export class Anchors {
  constructor (private readonly client: WhaleApiClient) {}

  /**
   * List anchors
   */

  async list (): Promise<AnchorData[]> {
    return await this.client.requestData('GET', 'anchors')
  }
}

export interface AnchorData {
  btcBlock: {
    height: number
    hash: string
    txHash: string
  }
  defiBlock: {
    height: number
    hash: string
  }
  previousAnchor: string
  rewardAddress: string
  confirmations: number
  signatures: number
  active?: boolean
  anchorCreationHeight?: number
}
