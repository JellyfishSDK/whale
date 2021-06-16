import { Controller, Get, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { OraclePriceFeed } from '@defichain/jellyfish-api-core/dist/category/oracle'
import BigNumber from 'bignumber.js'

@Controller('/v1/:network/oracles')
export class OraclesController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate query oracles.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<OracleData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OracleData>> {
    const oracleids = await this.client.oracle.listOracles()

    let oracles: any[] = []

    for (let i = 0; i < oracleids.length; i += 1) {
      const oracleid = oracleids[i]
      const oracle = await this.client.oracle.getOracleData(oracleid)
      oracles.push(oracle)
    }

    oracles = oracles.sort((a: OracleData, b: OracleData) => (a.weightage > b.weightage ? 1 : -1))

    const start = query.next !== undefined ? query.next : oracles[0].oracleid

    let indexStart = oracles.map(x => x.oracleid).indexOf(start)

    if (indexStart > 0 && start !== oracles[0].oracleid) {
      indexStart += 1
    }

    if (indexStart >= 0) {
      oracles = oracles.slice(indexStart, indexStart + query.size)
    } else {
      oracles = []
    }

    return ApiPagedResponse.of(oracles, query.size, item => {
      return item.oracleid
    })
  }

  /**
   * Get information about a oracle with id of the oracle.
   *
   * @param {string} oracleid
   * @return {Promise<OracleData>}
   */
  @Get('/:id')
  async get (@Param('id') oracleid: string): Promise<OracleData> {
    try {
      return await this.client.oracle.getOracleData(oracleid)
    } catch (e) {
      if (e.payload.message === `oracle <${oracleid}> not found`) {
        throw new NotFoundException('Unable to find oracle')
      } else {
        throw new BadRequestException(e)
      }
    }
  }

  /**
   * Paginate query oracle latest raw prices.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<OracleData>>}
   */
  @Get('/latestRawPrices')
  async latestRawPrices (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OracleRawPrice>> {
    let oracles: OracleRawPrice[] = await this.client.call('listlatestrawprices', [], 'bignumber')

    oracles = oracles.sort((a: OracleRawPrice, b: OracleRawPrice) => (a.weightage > b.weightage ? 1 : -1))

    const start = query.next !== undefined ? query.next : oracles[0].oracleid

    let indexStart = oracles.map((x: { oracleid: any }) => x.oracleid).indexOf(start)

    if (indexStart > 0 && start !== oracles[0].oracleid) {
      indexStart += 1
    }

    if (indexStart >= 0) {
      oracles = oracles.slice(indexStart, indexStart + query.size)
    } else {
      oracles = []
    }

    return ApiPagedResponse.of(oracles, query.size, item => {
      return item.oracleid
    })
  }

  /**
   * Paginate query oracle raw prices.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<OracleData>>}
   */
  @Get('/prices')
  async listPrices (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<ListPricesData>> {
    let prices: ListPricesData[] = await this.client.call('listprices', [], 'bignumber')

    prices = prices.sort((a: ListPricesData, b: ListPricesData) => a.token.concat('-').concat(a.currency) > b.token.concat('-').concat(b.currency) ? 1 : -1)

    const start = query.next !== undefined ? query.next : prices[0].token.concat('-').concat(prices[0].currency)

    let indexStart = prices.map(x => x.token.concat('-').concat(x.currency)).indexOf(start)

    if (indexStart > 0 && start !== prices[0].token.concat('-').concat(prices[0].currency)) {
      indexStart += 1
    }

    if (indexStart >= 0) {
      prices = prices.slice(indexStart, indexStart + query.size)
    } else {
      prices = []
    }

    return ApiPagedResponse.of(prices, query.size, item => {
      return item.token.concat('-').concat(item.currency)
    })
  }

  /**
   * Get the oracle price with id of the oracle.
   *
   * @param {string} token
   * @param {string} currency
   * @return {Promise<string>}
   */
  @Get('/price/:token/:currency')
  async getPrice (@Param('token') token: string, @Param('currency') currency: string): Promise<string> {
    try {
      return await this.client.call('getprice', [{ token, currency }], 'bignumber')
    } catch (e) {
      /* istanbul ignore else */
      if (e.payload.message === 'no live oracles for specified request') {
        throw new NotFoundException('Unable to find oracle')
      } else {
        throw new BadRequestException(e)
      }
    }
  }
}

// Once test containers updated and includes all the RPCS, the following code will be removed
export enum OracleRawPriceState {
  // LIVE = 'live',
  EXPIRED = 'expired'
}

export interface OracleRawPrice {
  oracleid: string
  priceFeeds: OraclePriceFeed
  rawprice: BigNumber
  weightage: BigNumber
  state: OracleRawPriceState
  timestamp: BigNumber
}

export interface ListPricesData {
  token: string
  currency: string
  price?: BigNumber
  ok: boolean | string
}

export interface OracleTokenPrice {
  token: string
  currency: string
  amount: number
  timestamp: number
}

export interface OracleData {
  oracleid: string
  address: string
  priceFeeds: OraclePriceFeed[]
  tokenPrices: OracleTokenPrice[]
  weightage: number
}
