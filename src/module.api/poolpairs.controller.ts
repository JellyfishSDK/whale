import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { poolpair } from '@defichain/jellyfish-api-core'
import { BadRequestException, Controller, Get, Param, Query, UseGuards, UseInterceptors, PipeTransform, ArgumentMetadata } from '@nestjs/common'
import { IsOptional, IsBooleanString, validate } from 'class-validator'
import { ExceptionInterceptor } from './interceptors/exception.interceptor'
import { NetworkGuard } from './guards/network.guard'
import { ResponseInterceptor } from './interceptors/response.interceptor'
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
  pagination?: poolpair.PoolPairPagination

  @IsOptional()
  verbose?: boolean

  @IsOptional()
  options?: poolpair.PoolShareOptions
}

export class PoolPairsQueryPipe implements PipeTransform {
  async transform (value: any, metadata: ArgumentMetadata): Promise<PoolPairsFilter> {
    await this.validate(value)

    const pagination: poolpair.PoolPairPagination = {
      start: Number(value.start) ?? 0,
      including_start: value.including_start ?? true,
      limit: Number(value.limit) ?? 100.0
    }

    const verbose = value.verbose?.toLowerCase() !== 'false'

    const options: poolpair.PoolShareOptions = {
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
@UseInterceptors(ResponseInterceptor, ExceptionInterceptor)
export class PoolPairsController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * List pool pairs with optional filters
   *
   * @param {PoolPairsFilter} [filter] filter of listing pool pairs
   * @return {Promise<PoolPairInfoDto>}
   */
  @Get()
  async list (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairInfoDto[]> {
    const result = await this.client.poolpair.listPoolPairs(filter?.pagination, filter?.verbose)
    return toPoolPairsDto(result)
  }

  /**
   * Get pool pair by symbol
   *
   * @param {string} symbol token's symbol
   * @param {PoolPairsFilter} [filter] pool pair filter
   * @return {Promise<PoolPairInfoDto>}
   */
  @Get('/:symbol')
  async get (@Param('symbol') symbol: string, @Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolPairInfoDto> {
    try {
      const result = await this.client.poolpair.getPoolPair(symbol, filter?.verbose)
      const id = Object.keys(result)[0]
      return toPoolPairDto(result[id], id)
    } catch (e) {
      throw new BadRequestException()
    }
  }

  /**
   * List pool shares with optional filters
   *
   * @param {PoolPairsFilter} [filter]
   * @returns {Promise<PoolShareInfoDto[]>}
   */
  @Get('/shares')
  async listPoolShares (@Query(new PoolPairsQueryPipe()) filter?: PoolPairsFilter): Promise<PoolShareInfoDto[]> {
    const result = await this.client.poolpair.listPoolShares(filter?.pagination, filter?.verbose, filter?.options)
    return toPoolSharesDto(result)
  }
}

/**
 * Map PoolPairsResult to PoolPairInfoDto[]
 *
 * @param {PoolPairsResult} PoolPairsResult
 * @return {PoolPairInfoDto[]}
 */
function toPoolPairsDto (PoolPairsResult: PoolPairsResult): PoolPairInfoDto[] {
  const result: PoolPairInfoDto[] = []

  for (const k in PoolPairsResult) {
    const poolPairInfo = PoolPairsResult[k] as poolpair.PoolPairInfo
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
function toPoolPairDto (poolPairInfo: poolpair.PoolPairInfo, id: string): PoolPairInfoDto {
  const data: PoolPairInfoDto = {
    id,
    symbol: poolPairInfo.symbol,
    name: poolPairInfo.name,
    status: poolPairInfo.status,
    idTokenA: poolPairInfo.idTokenA,
    idTokenB: poolPairInfo.idTokenB,
    reserveA: poolPairInfo.reserveA,
    reserveB: poolPairInfo.reserveB,
    commission: poolPairInfo.commission,
    totalLiquidity: poolPairInfo.totalLiquidity,
    'reserveA/reserveB': poolPairInfo['reserveA/reserveB'],
    'reserveB/reserveA': poolPairInfo['reserveB/reserveA'],
    tradeEnabled: poolPairInfo.tradeEnabled,
    ownerAddress: poolPairInfo.ownerAddress,
    blockCommissionA: poolPairInfo.blockCommissionA,
    blockCommissionB: poolPairInfo.blockCommissionB,
    rewardPct: poolPairInfo.rewardPct,
    customRewards: poolPairInfo.customRewards,
    creationTx: poolPairInfo.creationTx,
    creationHeight: poolPairInfo.creationHeight
  }
  return data
}

/**
 * Map PoolSharesResult to PoolShareInfoDto[]
 *
 * @param {PoolSharesResult} poolSharesResult
 * @return {PoolShareInfoDto[]}
 */
function toPoolSharesDto (poolSharesResult: PoolSharesResult): PoolShareInfoDto[] {
  const result: PoolShareInfoDto[] = []

  for (const k in poolSharesResult) {
    const poolShareInfo = poolSharesResult[k] as poolpair.PoolShareInfo
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
function toPoolShareDto (poolShareInfo: poolpair.PoolShareInfo): PoolShareInfoDto {
  const data: PoolShareInfoDto = {
    poolID: poolShareInfo.poolID,
    owner: poolShareInfo.owner,
    percent: poolShareInfo['%'],
    amount: poolShareInfo.amount,
    totalLiquidity: poolShareInfo.totalLiquidity
  }
  return data
}

export interface PoolPairsResult {
  [id: string]: poolpair.PoolPairInfo | PoolPairInfoDto
}

export interface PoolPairInfoDto {
  id: string
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

export interface PoolSharesResult {
  [id: string]: poolpair.PoolShareInfo | PoolShareInfoDto
}

export interface PoolShareInfoDto {
  poolID: string
  owner: string
  percent: BigNumber
  amount: BigNumber
  totalLiquidity: BigNumber
}
