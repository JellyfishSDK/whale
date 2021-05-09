import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  PipeTransform,
  ArgumentMetadata,
  UseGuards,
  UseInterceptors,
  Param
} from '@nestjs/common'
import { NetworkGuard } from './commons/network.guard'
import { ResponseInterceptor } from './commons/response.interceptor'
import { ExceptionInterceptor } from './commons/exception.interceptor'
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

class TokenSizePipe implements PipeTransform {
  async transform (value: any, metadata: ArgumentMetadata): Promise<string> {
    await validatePipe(TokenSizeQuery, value)
    return value.size
  }
}

class TokenNextPipe implements PipeTransform {
  async transform (value: any, metadata: ArgumentMetadata): Promise<string> {
    await validatePipe(TokenNextQuery, value)
    return value.next
  }
}

async function validatePipe (cls: any, value: any): Promise<void> {
  const tokenNextQuery = plainToClass(cls, value)
  const errors = await validate(tokenNextQuery)

  if (errors.length > 0) {
    const errorConstraints = errors.map(error => error.constraints)
    const errorMessages = constructErrorMessages(errorConstraints)
    throw new BadRequestException(errorMessages)
  }
}

function constructErrorMessages (errorConstraints: any): string[] {
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

@Controller('/v1/:network/tokens')
@UseGuards(NetworkGuard)
@UseInterceptors(ResponseInterceptor, ExceptionInterceptor)
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Returns information about token.
   *
   * @param {number} size Maximum number of tokens to return.
   * @param {number} next first key to iterate from, in lexicographical order.
   * @return {Promise<SliceResponse<TokenInfoDto>>}
   */
  @Get('/')
  async get (
    @Query(new TokenSizePipe()) size = '1000000000',
    @Query(new TokenNextPipe()) next = '0'
  ): Promise<SliceResponse<TokenInfoDto>> {
    const start = Number(next)
    const limit = Number(size)

    try {
      const pagination: TokenPagination = {
        start,
        including_start: true,
        limit
      }

      const data = await this.client.token.listTokens(pagination, true)

      const tokenInfoDtos: TokenInfoDto[] = []

      for (const key of Object.keys(data)) {
        tokenInfoDtos.push(toTokenInfoDTO(data[key]))
      }

      return SliceResponse.of(tokenInfoDtos, limit, item => {
        return item.symbol_key
      })
    } catch (e) {
      throw new BadRequestException(e.payload.message)
    }
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
      const data = await this.client.token.getToken(id)
      return toTokenInfoDTO(data[Object.keys(data)[0]])
    } catch (e) {
      throw new BadRequestException(e.payload.message)
    }
  }
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
