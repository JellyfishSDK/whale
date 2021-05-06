import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Controller, Get, UseGuards, UseInterceptors, Param } from '@nestjs/common'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { TransformInterceptor } from './commons/transform.interceptor'
import { TokenInfo, TokenPagination } from '@defichain/jellyfish-api-core/dist/category/token'

@Controller('/v1/:network/tokens')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
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
    pagination: TokenPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true): Promise<TokenInfoDto[]> {
    try {
      const result = await this.client.token.listTokens(pagination, verbose)
      return toTokenInfoDTOs(result)
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
      const result = await this.client.token.getToken(id)
      return toTokenInfoDTO(result[Object.keys(result)[0]])
    } catch (e) {
      throw new BadRequestException(e.payload.message)
    }
  }
}

interface TokenInfoDto {
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

/**
   * Map data to TokenInfoDto[].
   *
   * @param {data} any
   * @return {TokenInfoDto[]}
   */
function toTokenInfoDTOs (data: any): TokenInfoDto[] {
  const result: TokenInfoDto[] = []

  Object.keys(data).forEach(function (key, index) {
    result.push(data[Object.keys(data)[index]])
  })

  return result
}
