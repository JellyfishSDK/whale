import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Controller, Get, Query, PipeTransform, ArgumentMetadata, UseGuards, UseInterceptors, Param } from '@nestjs/common'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { ResponseInterceptor } from './commons/response.interceptor'
import { TokenInfo, TokenPagination } from '@defichain/jellyfish-api-core/dist/category/token'
import { IsOptional, validate } from 'class-validator'
import { IsPositiveNumberString } from './custom.validations'
import { plainToClass } from 'class-transformer'
import { SliceResponse } from '@src/module.api/commons/slice.response'

class TokenSizeQuery {
  @IsOptional()
  @IsPositiveNumberString()
  size?: string
}

class TokenNextQuery {
  @IsOptional()
  @IsPositiveNumberString()
  next?: string
}

export class TokensFilter {
  @IsOptional()
  size?: string

  @IsOptional()
  next?: string
}

export class TokensSizePipe implements PipeTransform {
  async transform (value: any, metadata: ArgumentMetadata): Promise<string> {
    await this.validate(value)
    return value.size ?? '0'
  }

  async validate (value: any): Promise<void> {
    const tokenSizeQuery = plainToClass(TokenSizeQuery, value)
    const errors = await validate(tokenSizeQuery)

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

export class TokensNextPipe implements PipeTransform {
  async transform (value: any, metadata: ArgumentMetadata): Promise<string> {
    await this.validate(value)
    return value.next ?? '0'
  }

  async validate (value: any): Promise<void> {
    const tokenNextQuery = plainToClass(TokenNextQuery, value)
    const errors = await validate(tokenNextQuery)

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

@Controller('/v1/:network/tokens')
@UseGuards(NetworkGuard)
@UseInterceptors(ResponseInterceptor, ExceptionInterceptor)
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Returns information about token.
   *
   * @return {Promise<TokenInfoDto[]>}
   */

  @Get('/')
  async get (
    @Query(new TokensSizePipe()) size?: number,
      @Query(new TokensNextPipe()) next?: string
  ): Promise<SliceResponse<TokenInfoDto>> {
    const hid = await this.client.token.listTokens()
    const items = await this.query(hid, size, next)
    return SliceResponse.of(items, size ?? 100, item => {
      return item.symbol_key
    })
  }

  async query (hid: any, size?: number, next?: string): Promise<TokenInfoDto[]> {
    const pagination: TokenPagination = {
      start: Number(next) ?? 0,
      including_start: true,
      limit: Number(size) ?? 100
    }

    const tokenInfoDtos: TokenInfoDto[] = []

    const results = await this.client.token.listTokens(pagination, true)

    for (const key of Object.keys(results)) {
      tokenInfoDtos.push(toTokenInfoDTO(results[key]))
    }

    return tokenInfoDtos
  }

  /**
   * Returns information about token.
   *
   * @param {string} id id/symbol/creationTx
   * @return {Promise<TokenInfoDto>}
   */
  @Get('/:id')
  async getId (@Param('id') id: string): Promise<TokenInfoDto> {
    try {
      const result = await this.client.token.getToken(id)
      return toTokenInfoDTO(result[Object.keys(result)[0]])
    } catch (e) {
      throw new BadRequestException(e.payload.message)
    }
  }
}

export interface TokenInfoDto {
  symbol: string
  symbol_key: string
  name: string
  decimal: number
  limit: number
  mintable: boolean
  tradeable: boolean
  is_dat: boolean
  is_lps: boolean
  finalized: boolean
  minted: number
  creation_tx: string
  creation_height: number
  destruction_tx: string
  destruction_height: number
  collateral_address: string
}

/**
 * Map TokenInfo to TokenInfoDto.
 *
 * @param {TokenInfo} tokenInfo
 * @return {TokenInfoDto}
 */
function toTokenInfoDTO (tokenInfo: TokenInfo): TokenInfoDto {
  return {
    symbol: tokenInfo.symbol,
    symbol_key: tokenInfo.symbolKey,
    name: tokenInfo.name,
    decimal: tokenInfo.decimal,
    limit: tokenInfo.limit,
    mintable: tokenInfo.mintable,
    tradeable: tokenInfo.tradeable,
    is_dat: tokenInfo.isDAT,
    is_lps: tokenInfo.isLPS,
    finalized: tokenInfo.finalized,
    minted: tokenInfo.minted,
    creation_tx: tokenInfo.creationTx,
    creation_height: tokenInfo.creationHeight,
    destruction_tx: tokenInfo.destructionTx,
    destruction_height: tokenInfo.destructionHeight,
    collateral_address: tokenInfo.collateralAddress
  }
}
