import { WhaleApiClient } from '../whale.api.client'

export class Transactions {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {RawTxReq} rawTx to submit to the network.
   * @throws WhaleApiException if failed mempool acceptance
   */
  async send (rawTx: RawTxReq): Promise<string> {
    return await this.client.requestData('POST', 'transactions', rawTx)
  }

  /**
   * @param {string} id of transaction to query
   * @return {Promise<Transaction>}
   */
  async get (id: string): Promise<Transaction> {
    return await this.client.requestData('GET', `transactions/${id}`)
  }

  /**
   * @param {RawTxReq} rawTx to test mempool acceptance
   * @throws WhaleApiException if failed mempool acceptance
   */
  async test (rawTx: RawTxReq): Promise<void> {
    return await this.client.requestData('POST', 'transactions/test', rawTx)
  }

  /**
   * @param {number} confirmationTarget in blocks till fee get confirmed
   * @return {Promise<number>} fee rate per KB
   */
  async estimateFee (confirmationTarget: number = 10): Promise<number> {
    return await this.client.requestData('GET', `transactions/estimate-fee?confirmationTarget=${confirmationTarget}`)
  }
}

/**
 * Raw transaction request
 */
export interface RawTxReq {
  hex: string
  maxFeeRate?: number
}

/**
 * Transaction interface
 */
export interface Transaction {
  id: string
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
  txid: string
  hash: string
  version: number
  size: number
  vSize: number
  weight: number
  lockTime: number
  vinCount: number
  voutCount: number
}

/**
 * TransactionVin interface
 */
export interface TransactionVin {
  id: string
  txid: string
  coinbase?: string
  vout?: {
    id: string
    txid: string
    n: number
    value: string
    tokenId?: number
  }
  script?: {
    hex: string
  }
  txInWitness?: string[]
  sequence: string
}

/**
 * TransactionVout interface
 */
export interface TransactionVout {
  id: string
  txid: string
  n: number
  value: string
  tokenId?: number
  script: {
    hex: string
    type: string
  }
}
