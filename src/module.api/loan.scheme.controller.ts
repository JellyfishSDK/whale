import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { GetLoanSchemeResult, LoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'

@Controller('/loan/schemes')
export class LoanSchemeController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate loan schemes.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanSchemeResult>> {
    const data = await this.client.loan.listLoanSchemes()
    const result = data.sort((a, b) => a.id.localeCompare(b.id))

    let nextIndex = 0

    if (query.next !== undefined) {
      const findIndex = result.findIndex(result => result.id === query.next)
      if (findIndex > 0) {
        nextIndex = findIndex + 1
      } else {
        nextIndex = result.length
      }
    }

    const schemes = result.slice(nextIndex, nextIndex + query.size)
    return ApiPagedResponse.of(schemes, query.size, item => {
      return item.id
    })
  }

  /**
   * Get information about a scheme with id of the scheme.
   *
   * @param {string} id
   * @return {Promise<GetLoanSchemeResult>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<GetLoanSchemeResult> {
    try {
      return await this.client.loan.getLoanScheme(id)
    } catch (err) {
      if (err?.payload?.message === `Cannot find existing loan scheme with id ${id}`) {
        throw new NotFoundException('Unable to find scheme')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}
