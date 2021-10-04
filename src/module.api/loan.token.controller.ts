import { Controller, Get, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import {
  ListLoanTokenResult
} from '@defichain/jellyfish-api-core/dist/category/loan'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import BigNumber from 'bignumber.js'
import { LoanData } from '@whale-api-client/api/loan'

@Controller('/loan/tokens')
export class LoanTokenController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate loan tokens.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanData>> {
    const data: ListLoanTokenResult = await this.client.call('listloantokens', [], 'bignumber')
    const result: LoanData[] = Object.entries(data)
      .map(([id, value]) => {
        const token = value.token
        const newToken = Object.entries(token).map(([id1, value1]) => {
          return {
            id: id1,
            value: value1
          }
        })
        return mapTokenData(
          id,
          value.priceFeedId,
          value.interest,
          newToken[0].id,
          newToken[0].value
        )
      }).sort((a, b) => a.tokenId.localeCompare(b.tokenId))

    let nextIndex = 0

    if (query.next !== undefined) {
      const findIndex = result.findIndex((result: { tokenId: string | undefined }) => result.tokenId === query.next)
      if (findIndex > 0) {
        nextIndex = findIndex + 1
      } else {
        nextIndex = result.length
      }
    }

    const loanTokens = result.slice(nextIndex, nextIndex + query.size)
    return ApiPagedResponse.of(loanTokens, query.size, item => {
      return item.tokenId
    })
  }
}

function mapTokenData (
  id: string,
  priceFeedId: string,
  interest: BigNumber,
  tokenId: string,
  tokenInfo: TokenInfo
): LoanData {
  return {
    id,
    priceFeedId,
    interest,
    tokenId,
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    decimal: tokenInfo.decimal.toNumber(),
    limit: tokenInfo.limit.toFixed(),
    mintable: tokenInfo.mintable,
    tradeable: tokenInfo.tradeable,
    isDAT: tokenInfo.isDAT,
    isLPS: tokenInfo.isLPS,
    finalized: tokenInfo.finalized,
    minted: tokenInfo.minted.toFixed(),
    creation: { tx: tokenInfo.creationTx, height: tokenInfo.creationHeight.toNumber() },
    destruction: { tx: tokenInfo.destructionTx, height: tokenInfo.destructionHeight.toNumber() },
    collateralAddress: tokenInfo.collateralAddress !== '' ? tokenInfo.collateralAddress : undefined,
    displaySymbol: tokenInfo.isDAT && tokenInfo.symbol !== 'DFI' && !tokenInfo.isLPS ? `d${tokenInfo.symbol}` : tokenInfo.symbol
  }
}
