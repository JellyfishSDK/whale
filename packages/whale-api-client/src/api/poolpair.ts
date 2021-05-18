import BigNumber from 'bignumber.js'
import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for poolpair related services.
 */
export class PoolPair {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * List poolpairs
   *
   * @param {number} size of PoolPairInfoDto balance to query
   * @param {number} next set of PoolPairInfoDto
   * @return {Promise<ApiPagedResponse<PoolPairInfoDto>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<PoolPairInfoDto>> {
    return await this.client.requestList('GET', 'poolpairs', size, next)
  }
}

export interface PoolPairInfoDto {
  id: string
  symbol: string
  name: string
  status: string
  idTokenA: string
  idTokenB: string
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  'reserveA/reserveB': BigNumber | string
  'reserveB/reserveA': BigNumber | string
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards: BigNumber
  creationTx: string
  creationHeight: BigNumber
}
