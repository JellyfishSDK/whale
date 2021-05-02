import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { IsNotEmpty, IsOptional } from 'class-validator'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { TransformInterceptor } from './commons/transform.interceptor'

class PoolPairDto {
  @IsNotEmpty()
  metadata!: CreatePoolPairMetadata

  @IsOptional()
  utxos?: CreatePoolPairUTXO[]
}

class PoolLiquidityDto {
  @IsNotEmpty()
  from!: AddPoolLiquiditySource

  @IsNotEmpty()
  shareAddress!: string

  @IsOptional()
  options?: AddPoolLiquidityOptions
}

class PoolPairsQuery {
  @IsOptional()
  start?: string

  @IsOptional()
  including_start?: string

  @IsOptional()
  limit?: string

  @IsOptional()
  verbose?: string

  @IsOptional()
  isMineOnly?: string
}

@Controller('/v1/:network/poolpairs')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
export class PoolPairsController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * @param {PoolPairDto} body to create pool pair
   * @return {Promise<string>} hashes of string
   */
  @Post()
  async create (@Body() body: PoolPairDto): Promise<string> {
    try {
      return await this.client.poolpair.createPoolPair(body.metadata, body?.utxos)
    } catch (e) {
      throw new BadRequestException(e)
    }
  }

  /**
   * @param {PoolPairsQuery} query filter of listing pool pairs
   * @return {PoolPairResult}
   */
  @Get()
  async list (@Query() query?: PoolPairsQuery): Promise<PoolPairResult> {
    try {
      const filter = query !== undefined ? remap(query) : undefined
      return await this.client.poolpair.listPoolPairs(filter?.pagination, filter?.verbose)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  /**
   * @param {string} symbol token's symbol
   * @param {PoolPairsQuery} query pool pair filter
   * @return {PoolPairResult}
   */
  @Get(':symbol')
  async get (@Param('symbol') symbol: string, @Query() query?: PoolPairsQuery): Promise<PoolPairResult> {
    try {
      const filter = query !== undefined ? remap(query) : undefined
      return await this.client.poolpair.getPoolPair(symbol, filter?.verbose)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Get('/shares')
  async listPoolShares (@Query() query?: PoolPairsQuery): Promise<PoolShareResult> {
    try {
      const filter = query !== undefined ? remap(query) : undefined
      return await this.client.poolpair.listPoolShares(filter?.pagination, filter?.verbose, filter?.options)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Post('/liquidity')
  async addPoolLiquidity (@Body() body: PoolLiquidityDto): Promise<string> {
    try {
      const { from, shareAddress, options } = body
      return await this.client.poolpair.addPoolLiquidity(from, shareAddress, options)
    } catch (e) {
      throw new BadRequestException()
    }
  }
}

function remap (query: PoolPairsQuery): PoolPairsFilter {
  const pagination: PoolPairPagination = {
    start: Number(query?.start) ?? 0,
    including_start: Boolean(query?.including_start) ?? true,
    limit: Number(query?.limit) ?? 100
  }

  const verbose = Boolean(query?.verbose) ?? true

  const options: PoolPairsOptions = {
    isMineOnly: Boolean(query?.isMineOnly) ?? true
  }

  return {
    pagination,
    verbose,
    options
  }
}

export interface CreatePoolPairMetadata {
  tokenA: string
  tokenB: string
  commission: number
  status: boolean
  ownerAddress: string
  customRewards?: string
  pairSymbol?: string
}

export interface CreatePoolPairUTXO {
  txid: string
  vout: number
}

export interface PoolPairResult {
  [id: string]: PoolPairInfo
}

export interface PoolPairInfo {
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

export interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}

export interface PoolShareResult {
  [id: string]: PoolShareInfo
}

export interface PoolShareInfo {
  poolID: string
  owner: string
  '%': BigNumber
  amount: BigNumber
  totalLiquidity: BigNumber
}

export interface AddPoolLiquidityOptions {
  utxos?: AddPoolLiquidityUTXO[]
}

export interface AddPoolLiquiditySource {
  [address: string]: string | string[]
}

export interface AddPoolLiquidityUTXO {
  txid: string
  vout: number
}

export interface PoolPairsFilter {
  pagination?: PoolPairPagination
  verbose?: boolean
  options?: PoolPairsOptions
}

export interface PoolPairsOptions {
  isMineOnly?: boolean
}
