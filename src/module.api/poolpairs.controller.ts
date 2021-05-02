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
  start?: number

  @IsOptional()
  including_start?: boolean

  @IsOptional()
  limit?: number

  @IsOptional()
  verbose?: boolean

  @IsOptional()
  isMineOnly?: boolean
}

@Controller('/v1/:network/poolpairs')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
export class PoolPairsController {
  constructor (private readonly client: JsonRpcClient) {
  }

  @Post()
  async create (@Body() body: PoolPairDto): Promise<string> {
    try {
      return await this.client.poolpair.createPoolPair(body.metadata, body?.utxos)
    } catch (e) {
      throw new BadRequestException(e)
    }
  }

  @Get()
  async list (@Query() query?: PoolPairsQuery): Promise<PoolPairResult> {
    try {
      const filter = query !== undefined ? remap(query) : undefined
      return await this.client.poolpair.listPoolPairs(filter?.pagination, filter?.verbose)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Get(':symbol')
  async get (@Param('symbol') symbol: string, @Query() query?: PoolPairsQuery): Promise<PoolPairResult> {
    try {
      const filter = query !== undefined ? remap(query) : undefined
      return await this.client.poolpair.getPoolPair(symbol, filter?.verbose)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Get()
  async listPoolShares (@Query() query?: PoolPairsQuery): Promise<PoolShareResult> {
    try {
      const filter = query !== undefined ? remap(query) : undefined
      return await this.client.poolpair.listPoolShares(filter?.pagination, filter?.verbose, filter?.options)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Post()
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
    start: query?.start ?? 0,
    including_start: query?.including_start ?? true,
    limit: query?.limit ?? 100
  }

  const verbose = query?.verbose ?? true

  const options: PoolPairsOptions = {
    isMineOnly: query?.isMineOnly ?? true
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
