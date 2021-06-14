import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException, BadRequestException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { OraclePriceFeed } from '@defichain/jellyfish-api-core/dist/category/oracle'
import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
const container = new MasterNodeRegTestContainer()

@Controller('/v1/:network/oracle')
export class OracleController {
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

    let oracles = []

    for (let i = 0; i < oracleids.length; i += 1) {
      const oracleid = oracleids[i]
      const oracle = await this.client.oracle.getOracleData(oracleid)
      oracles.push(oracle)
    }

    oracles = oracles.sort((a: OracleData, b: OracleData) => (a.oracleid > b.oracleid ? 1 : -1))

    return ApiPagedResponse.of(oracles, oracles.length, item => {
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
  async get (@Param('id', ParseIntPipe) oracleid: string): Promise<OracleData> {
    try {
      return await this.client.oracle.getOracleData(oracleid)
    } catch (e) {
      /* istanbul ignore else */
      if (e.payload.message === 'Oracle not found') {
        throw new NotFoundException('Unable to find oracle')
      } else {
        throw new BadRequestException(e)
      }
    }
  }

  /**
   * Paginate query oracle prices.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<OracleData>>}
   */
  @Get('/rawPrices')
  async listRawPrices (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OracleRawPrice>> {
    // return await this.client.oracle.listLatestRawPrices()
    const oracles = (await container.call('listlatestrawprices'))
      .sort((a: OracleData, b: OracleData) => (a.oracleid > b.oracleid ? 1 : -1))

    return ApiPagedResponse.of(oracles, oracles.length, item => {
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
    // return await this.client.oracle.listPrices()
    const oracles = (await container.call('listprices'))
      .sort((a: OracleData, b: OracleData) => (a.oracleid > b.oracleid ? 1 : -1))

    return ApiPagedResponse.of(oracles, oracles.length, item => {
      return item.token
    })
  }

  /**
   * Get the oracle price with id of the oracle.
   *
   * @param {string} oracleid
   * @return {Promise<string>}
   */
  @Get('/price/:id')
  async getPrice (@Param('id', ParseIntPipe) oracleid: string): Promise<string> {
    try {
      // return await this.client.oracle.getPrice(id)
      return await container.call('getprice', [oracleid])
    } catch (e) {
      /* istanbul ignore else */
      if (e.payload.message === 'Oracle not found') {
        throw new NotFoundException('Unable to find oracle')
      } else {
        throw new BadRequestException(e)
      }
    }
  }
}

// Once test containers updated and includes all the RPCS, the following code will be removed
enum OracleRawPriceState {
  // LIVE = 'live',
  EXPIRED = 'expired'
}

interface OracleRawPrice {
  oracleid: string
  priceFeeds: OraclePriceFeed
  rawprice: BigNumber
  weightage: BigNumber
  state: OracleRawPriceState
  timestamp: BigNumber
}

interface ListPricesData {
  token: string
  currency: string
  price?: BigNumber
  ok: boolean | string
}

interface OracleData {
  oracleid: string
  address: string
  priceFeeds: OraclePriceFeed[]
  tokenPrices: OracleTokenPrice[]
  weightage: number
}

interface OracleTokenPrice {
  token: string
  currency: string
  amount: number
  timestamp: number
}
