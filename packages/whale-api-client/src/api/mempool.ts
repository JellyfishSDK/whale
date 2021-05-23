import { WhaleApiClient } from '../whale.api.client'
import BigNumber from 'bignumber.js'

export class Mempool {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Returns all transaction ids in memory pool.
   *
   * @return {Promise<string[]>}
   */
  async list (): Promise<String[]> {
    return await this.client.requestData('GET', 'mempool')
  }

  /**
   *  Get mempool info of a transaction with transaction id.
   *
   * @param {string} id
   * @return {Promise<MempoolTxData>}
   */
  async get (id: string): Promise<MempoolTxData> {
    return await this.client.requestData('GET', `mempool/${id}`)
  }
}

/**
 * Mempool data.
 */
export interface MempoolTxData {
  vsize: BigNumber
  size: BigNumber
  weight: BigNumber
  fee: BigNumber
  modifiedfee: BigNumber
  time: BigNumber
  height: BigNumber
  descendant: {
    count: BigNumber
    size: BigNumber
    fees: BigNumber
  }
  ancestor: {
    count: BigNumber
    size: BigNumber
    fees: BigNumber
  }
  wtxid: string
  fees: {
    base: BigNumber
    modified: BigNumber
    ancestor: BigNumber
    descendant: BigNumber
  }
  depends: string[]
  spentby: string[]
  'bip125-replaceable': boolean
}
