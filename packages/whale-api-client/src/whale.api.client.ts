import { Call } from './api/call'
import { Transactions } from './api/transactions'
import AbortController from 'abort-controller'
import fetch from 'cross-fetch'
import { raiseIfError, WhaleApiError } from './errors/api.error'
import { WhaleClientTimeoutException } from './errors/client.timeout.exception'

/**
 * WhaleApiClient Options
 */
export interface WhaleApiClientOptions {
  url: string

  /**
   * Millis before request is aborted.
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Version of API
   */
  version?: 'v1'

  /**
   * Network that whale client is configured to
   */
  network?: 'mainnet' | 'testnet' | 'regtest'
}

/**
 * WhaleApiClient default options
 */
export const DefaultOptions: WhaleApiClientOptions = {
  url: 'https://whale.ocean.defichain.com',
  timeout: 60000,
  version: 'v1',
  network: 'mainnet'
}

export interface ApiResponse<T> {
  data: T
  page?: ApiResponsePage
  error?: WhaleApiError
}

export interface ApiResponsePage {
  next?: string
}

/**
 * Supported REST Method for DeFi Whale
 */
export type Method = 'POST' | 'GET'

export class WhaleApiClient {
  public readonly call = new Call(this)
  public readonly transactions = new Transactions(this)

  constructor (
    private readonly options: WhaleApiClientOptions
  ) {
    this.options = Object.assign(DefaultOptions, options ?? {})
    this.options.url = this.options.url.replace(/\/$/, '')
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {object} body to send in request
   */
  async request<T> (method: Method, path: string, body: object): Promise<T> {
    const raw = await this.requestRaw(method, path, JSON.stringify(body))
    const response: ApiResponse<T> = await raw.json()
    raiseIfError(response)

    return response.data
  }

  async requestRaw (method: Method, path: string, body: string): Promise<Response> {
    const { url, timeout, version, network } = this.options

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    const endpoint = `${url}/${version as string}/${network as string}/${path}`
    const request = fetch(endpoint, {
      method: method,
      body: body,
      cache: 'no-cache',
      signal: controller.signal
    })

    try {
      const response = await request
      clearTimeout(id)
      return response
    } catch (err) {
      if (err.type === 'aborted') {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        throw new WhaleClientTimeoutException(timeout!)
      }

      throw err
    }
  }
}
