import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Controller, Get, Param, Query, UseGuards, UseInterceptors, PipeTransform, ArgumentMetadata } from '@nestjs/common'
import { IsOptional, IsBooleanString, validate } from 'class-validator'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { TransformInterceptor } from './commons/transform.interceptor'
import { IsPositiveNumberString } from './custom.validations'
import { plainToClass } from 'class-transformer'

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

class PoolPairsFilter {
  @IsOptional()
  pagination?: PoolPairPagination

  @IsOptional()
  verbose?: boolean

  @IsOptional()
  options?: PoolPairsOptions
}

export class PoolPairsQueryPipe implements PipeTransform {
  async transform (value: any, metadata: ArgumentMetadata): Promise<PoolPairsFilter> {
    await this.validate(value)

    const pagination: PoolPairPagination = {
      start: Number(value.start) ?? 0,
      including_start: value.including_start ?? true,
      limit: Number(value.limit) ?? 100.0
    }

    const verbose = value.verbose?.toLowerCase() !== 'false'

    const options: PoolPairsOptions = {
      isMineOnly: value.isMineOnly?.toLowerCase() !== 'false'
    }

    const poolPairsFilter = new PoolPairsFilter()
    poolPairsFilter.pagination = pagination
    poolPairsFilter.verbose = verbose
    poolPairsFilter.options = options

    return poolPairsFilter
  }

  async validate (value: any): Promise<void> {
    const poolPairsQuery = plainToClass(PoolPairsQuery, value)
    const errors = await validate(poolPairsQuery)
    if (errors.length > 0) {
      const errorConstraints = errors.map(error => error.constraints)

      const errorMessages = []
      for (let i = 0; i < errorConstraints.length; i += 1) {
        const constraint = errorConstraints[i]
        if (constraint !== undefined) {
          const errorMessage = Object.values(constraint)[0]
          errorMessages.push(errorMessage)
        }
      }
      throw new BadRequestException(errorMessages)
    }
  }
}

@Controller('/v1/:network/poolpairs')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
export class PoolPairsController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * @param {PoolPairsFilter} filter filter of listing pool pairs
   * @return {PoolPairResult}
   */
  @Get()
  async list (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairResult> {
    return await this.client.poolpair.listPoolPairs(filter?.pagination, filter?.verbose)
  }

  /**
   * @param {string} symbol token's symbol
   * @param {PoolPairsFilter} query pool pair filter
   * @return {PoolPairResult}
   */
  @Get('/:symbol')
  async get (@Param('symbol') symbol: string, @Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairResult> {
    try {
      return await this.client.poolpair.getPoolPair(symbol, filter?.verbose)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Get('/shares')
  async listPoolShares (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolShareResult> {
    return await this.client.poolpair.listPoolShares(filter?.pagination, filter?.verbose, filter?.options)
  }
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

export interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}

export interface PoolPairsOptions {
  isMineOnly?: boolean
}
