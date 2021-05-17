import { Controller, Get, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { TokenInfo, TokenResult } from '@defichain/jellyfish-api-core/dist/category/token'

@Controller('/v1/:network/tokens')
export class TokensController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * @param {string} list of tokens
   * @param {PaginationQuery} query
   */
  @Get('/')
  async get (
    @Query() query: PaginationQuery = { next: '0', size: 1000000 }
  ): Promise<ApiPagedResponse<TokenInfo>> {
    const result: TokenResult = await this.client.token.listTokens({
      start: Number(query.next),
      including_start: true,
      limit: query.size
    }, true)

    const tokens: TokenInfo[] = Object.entries(result)
      .map(([id, value]): TokenInfo => {
        return value
      })

    return ApiPagedResponse.of(tokens, query.size, item => {
      return item.symbolKey
    })
  }

  /**
   * Returns information about token.
   *
   * @param {string} id id/symbol/creationTx
   * @return {Promise<TokenResult>}
   */
  @Get('/:id')
  async getId (@Param('id') id: string): Promise<TokenInfo> {
    const data = await this.client.token.getToken(id)
    return data[Object.keys(data)[0]]
  }
}
