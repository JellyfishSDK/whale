import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
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
   * List pool pairs
   *
   * @param {number} size of PoolPairInfoDto balance to query
   * @param {number} next set of PoolPairInfoDto
   * @return {Promise<ApiPagedResponse<PoolPairInfoDto>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<PoolPairInfoDto>> {
    return await this.client.requestList('GET', 'poolpairs', size, next)
  }

  /**
   * Get pool pair
   *
   * @param {string} symbol
   * @return {Promise<PoolPairInfo>}
   */
  async get (symbol: string): Promise<PoolPairInfo> {
    return await this.client.requestData('GET', `poolpairs/${symbol}`)
  }
}

export interface PoolPairInfoDto {
  id: string
  symbol: string
  name: string
  status: string
  token: {
    a: string
    b: string
  }
  reserve: {
    a: BigNumber
    b: BigNumber
  }
  commission: BigNumber
  totalLiquidity: BigNumber
  tradeEnabled: boolean
  ownerAddress: string
  blockCommission: {
    a: BigNumber
    b: BigNumber
  }
  rewardPct: BigNumber
  customRewards: BigNumber
  creation: {
    tx: string
    height: BigNumber
  }
}

export interface PoolShareInfoDto {
  poolID: string
  owner: string
  percent: BigNumber
  amount: BigNumber
  totalLiquidity: BigNumber
}
