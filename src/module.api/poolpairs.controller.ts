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
   * @return {PoolPairsResult}
   */
  @Get()
  async list (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairInfoDto[]> {
    const result = await this.client.poolpair.listPoolPairs(filter?.pagination, filter?.verbose)
    return toPoolPairsDto(result)
  }

  /**
   * @param {string} symbol token's symbol
   * @param {PoolPairsFilter} query pool pair filter
   * @return {PoolPairInfoDto}
   */
  @Get('/:symbol')
  async get (@Param('symbol') symbol: string, @Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairInfoDto> {
    try {
      const result = await this.client.poolpair.getPoolPair(symbol, filter?.verbose)
      const id = Object.keys(result)[0]
      return toPoolPairDto(result[id] as PoolPairInfo, id)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  @Get('/shares')
  async listPoolShares (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolShareInfoDto[]> {
    const result = await this.client.poolpair.listPoolShares(filter?.pagination, filter?.verbose, filter?.options)
    return toPoolSharesDto(result)
  }
}

/**
 * Map PoolPairsResult to PoolPairsResult(Dto)
 *
 * @param {PoolPairsResult} PoolPairsResult
 * @return {PoolPairsResult}
 */
function toPoolPairsDto (PoolPairsResult: PoolPairsResult): PoolPairInfoDto[] {
  const result: PoolPairInfoDto[] = []

  for (const k in PoolPairsResult) {
    const poolPairInfo = PoolPairsResult[k] as PoolPairInfo
    result.push(toPoolPairDto(poolPairInfo, k))
  }

  return result
}

/**
 * Map PoolPairInfo to PoolPairInfoDto
 *
 * @param {PoolPairInfo} poolPairInfo
 * @return {PoolPairInfoDto}
 */
function toPoolPairDto (poolPairInfo: PoolPairInfo, id: string): PoolPairInfoDto {
  const data: PoolPairInfoDto = {
    id,
    symbol: poolPairInfo.symbol,
    name: poolPairInfo.name,
    status: poolPairInfo.status,
    id_token_a: poolPairInfo.idTokenA,
    id_token_b: poolPairInfo.idTokenB,
    reserve_a: poolPairInfo.reserveA,
    reserve_b: poolPairInfo.reserveB,
    commission: poolPairInfo.commission,
    total_liquidity: poolPairInfo.totalLiquidity,
    reserve_a_reserve_b: poolPairInfo['reserveA/reserveB'],
    reserve_b_reserve_a: poolPairInfo['reserveB/reserveA'],
    trade_enabled: poolPairInfo.tradeEnabled,
    owner_address: poolPairInfo.ownerAddress,
    block_commission_a: poolPairInfo.blockCommissionA,
    block_commission_b: poolPairInfo.blockCommissionB,
    reward_pct: poolPairInfo.rewardPct,
    custom_rewards: poolPairInfo.customRewards,
    creation_tx: poolPairInfo.creationTx,
    creation_height: poolPairInfo.creationHeight
  }
  return data
}

/**
 * Map PoolSharesResult to PoolSharesResult(Dto)
 *
 * @param {PoolSharesResult} poolSharesResult
 * @return {PoolSharesResult}
 */
function toPoolSharesDto (poolSharesResult: PoolSharesResult): PoolShareInfoDto[] {
  const result: PoolShareInfoDto[] = []

  for (const k in poolSharesResult) {
    const poolShareInfo = poolSharesResult[k] as PoolShareInfo
    result.push(toPoolShareDto(poolShareInfo))
  }

  return result
}

/**
 * Map PoolShareInfo to PoolShareInfoDto
 *
 * @param {PoolShareInfo} poolShareInfo
 * @returns {PoolShareInfoDto}
 */
function toPoolShareDto (poolShareInfo: PoolShareInfo): PoolShareInfoDto {
  const data: PoolShareInfoDto = {
    pool_id: poolShareInfo.poolID,
    owner: poolShareInfo.owner,
    percent: poolShareInfo['%'],
    amount: poolShareInfo.amount,
    total_liquidity: poolShareInfo.totalLiquidity
  }
  return data
}

export interface PoolPairsResult {
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
  id: string
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

export interface PoolSharesResult {
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
