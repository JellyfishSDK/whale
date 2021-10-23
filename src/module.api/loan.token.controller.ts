import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { LoanData } from '@whale-api-client/api/loan.token'
import { ListLoanTokenResult, LoanTokenDetails } from '@defichain/jellyfish-api-core/dist/category/loan'

@Controller('/loans/tokens')
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
  ): Promise<any> {
    const data = await this.client.loan.listLoanTokens()
    const result = Object.entries(data)
      .map(([id, value]) => {
        return mapTokenData(id, value)
      }).sort(a => Number.parseInt(a.id))

    let nextIndex = 0

    if (query.next !== undefined) {
      const findIndex = result.findIndex(result => result.id === query.next)
      if (findIndex > 0) {
        nextIndex = findIndex + 1
      } else {
        nextIndex = result.length
      }
    }

    const collateralTokens = result.slice(nextIndex, nextIndex + query.size)
    return ApiPagedResponse.of(collateralTokens, query.size, item => {
      return item.id
    })
  }

  /**
   * Get information about a loan token with given loan token id.
   *
   * @param {string} id
   * @return {Promise<LoanTokenDetails>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<LoanTokenDetails> {
    try {
      return await this.client.loan.getLoanToken(id)
    } catch (err) {
      if (err === 'DeFiDRpcError: DeFiDRpcError: \'Token 999 does not exist!') {
        throw new NotFoundException('Unable to find token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}

function mapTokenData (id: string, tokenResult: ListLoanTokenResult): LoanData {
  return {
    id: id,
    token: tokenResult.token,
    factor: tokenResult.interest,
    fixedIntervalPriceId: tokenResult.fixedIntervalPriceId
  }
}
