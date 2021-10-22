import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import {
  CollateralTokenDetails
} from '@defichain/jellyfish-api-core/dist/category/loan'
import { CollateralData } from '@whale-api-client/api/loan.collateral'

@Controller('/loans/collaterals')
export class LoanCollateralController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate loan collaterals.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<CollateralTokenDetails>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<CollateralData>> {
    const data = await this.client.loan.listCollateralTokens()
    const result: CollateralData[] = Object.entries(data)
      .map(([id, value]): CollateralData => {
        return mapCollateralData(id, value)
      }).sort((a, b) => a.token.localeCompare(b.token))

    let nextIndex = 0

    if (query.next !== undefined) {
      const findIndex = result.findIndex(result => result.token === query.next)
      if (findIndex > 0) {
        nextIndex = findIndex + 1
      } else {
        nextIndex = result.length
      }
    }

    const collateralTokens = result.slice(nextIndex, nextIndex + query.size)
    return ApiPagedResponse.of(collateralTokens, query.size, item => {
      return item.token
    })
  }

  /**
   * Get information about a collateral token with given collateral token.
   *
   * @param {string} id
   * @return {Promise<CollateralTokenDetails>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<CollateralTokenDetails> {
    try {
      return await this.client.loan.getCollateralToken(id)
    } catch (err) {
      if (err?.payload?.message === `Token ${id} does not exist!`) {
        throw new NotFoundException('Unable to find collateral token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}

function mapCollateralData (id: string, collaterals: CollateralTokenDetails): CollateralData {
  return {
    id: id,
    token: collaterals.token,
    factor: collaterals.factor,
    priceFeedId: collaterals.fixedIntervalPriceId,
    activateAfterBlock: collaterals.activateAfterBlock
  }
}
