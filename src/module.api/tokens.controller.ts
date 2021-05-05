import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Controller, Get, UseGuards, UseInterceptors, Param } from '@nestjs/common'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { TransformInterceptor } from './commons/transform.interceptor'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

@Controller('/v1/:network/tokens')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * @param {string} id token's symbol key
   * @return {TokenInfoDto}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<TokenInfoDto> {
    try {
      const result: any = await this.client.token.getToken(id)
      return toTokenInfoDTO(result[Object.keys(result)[0]])
    } catch (e) {
      if (e?.payload?.message === 'Token not found') {
        throw new BadRequestException(e.payload.message)
      }
      throw new BadRequestException()
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
 * Map TokenInfo to TokenInfoDto
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
