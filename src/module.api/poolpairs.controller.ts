import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { IsOptional, IsBooleanString } from 'class-validator'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { TransformInterceptor } from './commons/transform.interceptor'
import { IsPositiveNumberString } from './custom.validations'

class PoolPairsQuery {
  @IsOptional()
  @IsPositiveNumberString()
  start?: string

  @IsOptional()
  @IsBooleanString()
  including_start?: string

  @IsOptional()
  @IsPositiveNumberString()
  limit?: string

  @IsOptional()
  @IsBooleanString()
  verbose?: string

  @IsOptional()
  @IsBooleanString()
  isMineOnly?: string
}

@Controller('/v1/:network/poolpairs')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
export class PoolPairsController {
  constructor (private readonly client: JsonRpcClient) {
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
  @Get('/:symbol')
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
}

function remap (query: PoolPairsQuery): PoolPairsFilter {
  const pagination: PoolPairPagination = {
    start: Number(query.start) ?? 0,
    including_start: query.including_start?.toLowerCase() !== 'false',
    limit: Number(query.limit) ?? 100
  }

  const verbose = query.verbose?.toLowerCase() !== 'false'

  const options: PoolPairsOptions = {
    isMineOnly: query.isMineOnly?.toLowerCase() !== 'false'
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
