import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestException, Controller, Get, UseGuards, UseInterceptors, Param } from '@nestjs/common'
import { ExceptionInterceptor } from './commons/exception.interceptor'
import { NetworkGuard } from './commons/network.guard'
import { TransformInterceptor } from './commons/transform.interceptor'

@Controller('/v1/:network/tokens')
@UseGuards(NetworkGuard)
@UseInterceptors(TransformInterceptor, ExceptionInterceptor)
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * @param {string} id token's symbol key
   * @return {TokenResult}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<TokenResult> {
    try {
      return await this.client.token.getToken(id)
    } catch (e) {
      throw new BadRequestException()
    }
  }
}

export interface TokenResult {
  [id: string]: TokenInfo
}

export interface TokenInfo {
  symbol: string
  symbolKey: string
  name: string
  decimal: number
  limit: number
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  finalized: boolean
  minted: number
  creationTx: string
  creationHeight: number
  destructionTx: string
  destructionHeight: number
  collateralAddress: string
}
