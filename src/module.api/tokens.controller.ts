import { Controller, Get, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { PaginationQuery } from '@src/module.api/_core/api.query'

@Controller('/v1/:network/tokens')
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Returns information about tokens.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<TokenInfo>>}
   */
  @Get('/')
  async get (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<TokenInfo>> {
    const data = await this.client.token.listTokens({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined,
      limit: query.size
    }, true)
    const tokens: TokenData[] = Object.entries(data)
      .map(([id, value]): TokenData => {
        return {
          id: id,
          symbol: value.symbol,
          symbolKey: value.symbolKey,
          name: value.name,
          decimal: value.decimal,
          limit: value.limit,
          mintable: value.mintable,
          tradeable: value.tradeable,
          isDAT: value.isDAT,
          isLPS: value.isLPS,
          finalized: value.finalized,
          minted: value.minted,
          creationTx: value.creationTx,
          creationHeight: value.creationHeight,
          destructionTx: value.destructionTx,
          destructionHeight: value.destructionHeight,
          collateralAddress: value.collateralAddress
        }
      }).sort(a => Number.parseInt(a.id))
    return ApiPagedResponse.of(tokens, query.size, item => {
      return item.id
    })
  }

  /**
   * Returns information about tokens.
   *
   * @param {string} id id/symbol/creationTx
   * @return {Promise<TokenInfo>}
   */
  @Get('/:id')
  async getId (@Param('id') id: string): Promise<TokenInfo> {
    const data = await this.client.token.getToken(id)
    return data[Object.keys(data)[0]]
  }
}

interface TokenData {
  id: string
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
