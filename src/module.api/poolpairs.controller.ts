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
  is_mine_only?: string
}

export class PoolPairsFilter {
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
      const errorMessages = this.constructErrorMessages(errorConstraints)
      throw new BadRequestException(errorMessages)
    }
  }

  constructErrorMessages (errorConstraints: any): string[] {
    const errorMessages: string[] = []
    for (let i = 0; i < errorConstraints.length; i += 1) {
      const constraint = errorConstraints[i]
      if (constraint !== undefined) {
        const errorMessage = Object.values(constraint)[0] as string
        errorMessages.push(errorMessage)
      }
    }
    return errorMessages
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
    const result = await this.client.poolpair.listPoolPairs(filter?.pagination, filter?.verbose)
    return poolPairDtoMapper(result)
  }

  /**
   * @param {string} symbol token's symbol
   * @param {PoolPairsFilter} query pool pair filter
   * @return {PoolPairResult}
   */
  @Get('/:symbol')
  async get (@Param('symbol') symbol: string, @Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairResult> {
    try {
      const result = await this.client.poolpair.getPoolPair(symbol, filter?.verbose)
      return poolPairDtoMapper(result)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Get('/shares')
  async listPoolShares (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolShareResult> {
    const result = await this.client.poolpair.listPoolShares(filter?.pagination, filter?.verbose, filter?.options)
    return poolShareDtoMapper(result)
  }
}

function poolPairDtoMapper (object: any): PoolPairResult {
  const result: { [key: string]: any } = {}

  for (const k in object) {
    const poolPairInfo = object[k]
    const data: { [key: string]: any } = {}
    result[k] = data
    for (const k in poolPairInfo) {
      switch (k) {
        case 'idTokenA':
          data.id_token_a = poolPairInfo[k]
          break
        case 'idTokenB':
          data.id_token_b = poolPairInfo[k]
          break
        case 'reserveA':
          data.reserve_a = poolPairInfo[k]
          break
        case 'reserveB':
          data.reserve_b = poolPairInfo[k]
          break
        case 'totalLiquidity':
          data.total_liquidity = poolPairInfo[k]
          break
        case 'reserveA/reserveB':
          data.reserve_a_reserve_b = poolPairInfo[k]
          break
        case 'reserveB/reserveA':
          data.reserve_b_reserve_a = poolPairInfo[k]
          break
        case 'tradeEnabled':
          data.trade_enabled = poolPairInfo[k]
          break
        case 'ownerAddress':
          data.owner_address = poolPairInfo[k]
          break
        case 'blockCommissionA':
          data.block_commission_a = poolPairInfo[k]
          break
        case 'blockCommissionB':
          data.block_commission_b = poolPairInfo[k]
          break
        case 'rewardPct':
          data.reward_pct = poolPairInfo[k]
          break
        case 'customRewards':
          data.custom_rewards = poolPairInfo[k]
          break
        case 'creationTx':
          data.creation_tx = poolPairInfo[k]
          break
        case 'creationHeight':
          data.creation_height = poolPairInfo[k]
          break
        default:
          data[k] = poolPairInfo[k]
          break
      }
    }
  }
  return result
}

function poolShareDtoMapper (object: any): any {
  const result: { [key: string]: any } = {}

  for (const k in object) {
    const poolPairInfo = object[k]
    const data: { [key: string]: any } = {}
    result[k] = data
    for (const k in poolPairInfo) {
      switch (k) {
        case 'poolID':
          data.pool_id = poolPairInfo[k]
          break
        case '%':
          data.percent = poolPairInfo[k]
          break
        case 'totalLiquidity':
          data.total_liquidity = poolPairInfo[k]
          break
        default:
          data[k] = poolPairInfo[k]
          break
      }
    }
  }
  return result
}

export interface PoolPairResult {
  [id: string]: PoolPairInfo | PoolPairInfoDto
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

export interface PoolPairInfoDto {
  symbol: string
  name: string
  status: string
  id_token_a: string
  id_token_b: string
  reserve_a: BigNumber
  reserve_b: BigNumber
  commission: BigNumber
  total_liquidity: BigNumber
  reserve_a_reserve_b: BigNumber | string
  reserve_b_reserve_a: BigNumber | string
  trade_enabled: boolean
  owner_address: string
  block_commission_a: BigNumber
  block_commission_b: BigNumber
  reward_pct: BigNumber
  custom_rewards: BigNumber
  creation_tx: string
  creation_height: BigNumber
}

export interface PoolShareResult {
  [id: string]: PoolShareInfo | PoolShareInfoDto
}

export interface PoolShareInfo {
  poolID: string
  owner: string
  '%': BigNumber
  amount: BigNumber
  totalLiquidity: BigNumber
}

export interface PoolShareInfoDto {
  pool_id: string
  owner: string
  percent: BigNumber
  amount: BigNumber
  total_liquidity: BigNumber
}

export interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}

export interface PoolPairsOptions {
  isMineOnly?: boolean
}
