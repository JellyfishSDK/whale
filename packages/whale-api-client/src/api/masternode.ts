import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for masternode related services.
 */
export class Masternodes {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Query list of masternodes.
   *
   * @param {number} size masternodes size to query
   * @param {number} next next set of masternodes
   * @return {Promise<ApiPagedResponse<MasternodeData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<MasternodeData>> {
    return await this.client.requestList('GET', 'masternodes', size, next)
  }

  /**
   * Query information about a masternode with given id.
   *
   * @param {string} id masternode id to query
   * @return {Promise<MasternodeData>}
   */
  async get (id: string): Promise<MasternodeData> {
    return await this.client.requestData('GET', `masternodes/${id}`)
  }
}

/**
 * Masternode data
 */
export interface MasternodeData {
  id: string
  ownerAuthAddress: string
  operatorAuthAddress: string
  creationHeight: number
  resignHeight: number
  resignTx: string
  banHeight: number
  banTx: string
  state: MasternodeState
  mintedBlocks: number
  ownerIsMine: boolean
  operatorIsMine: boolean
  localMasternode: boolean
}

/**
 * Masternode state
 */
export enum MasternodeState {
  PRE_ENABLED = 'PRE_ENABLED',
  ENABLED = 'ENABLED',
  PRE_RESIGNED = 'PRE_RESIGNED',
  RESIGNED = 'RESIGNED',
  PRE_BANNED = 'PRE_BANNED',
  BANNED = 'BANNED',
  UNKNOWN = 'UNKNOWN'
}
