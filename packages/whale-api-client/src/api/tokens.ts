import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

export class Tokens {
  constructor (private readonly client: WhaleApiClient) {
  }

  async get (size: number = 30, next?: string): Promise<ApiPagedResponse<TokenData>> {
    return await this.client.requestList('GET', 'tokens/all', size, next)
  }

  async getId (id: string): Promise<string> {
    return await this.client.requestData('GET', 'tokens', id)
  }
}

/**
 * Tokens
 */
export interface TokenData {
  id: string
  symbol: string
  symbolKey: string
  name: string
  decimal: number
  limit: number
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  finalized: boolean
  minted: number
  creationTx: string
  creationHeight: number
  destructionTx: string
  destructionHeight: number
  collateralAddress: string
}
