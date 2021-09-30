import { BadRequestException, Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
// import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
// import { PaginationQuery } from '@src/module.api/_core/api.query'
import { VaultDetails } from '@defichain/jellyfish-api-core/dist/category/loan'

@Controller('/loan')
export class LoanController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Paginate loan schemes.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanSchemeResult>>}
   */
  // @Get('/vaults')
  // async list (
  //   @Query() query: PaginationQuery
  // ): Promise<ApiPagedResponse<LoanSchemeResult>> {
  // const data = await this.client.loan.listVaults()
  // const result = await data.sort(a => Number.parseInt(a.id))

  // const data:any = []
  // const result = await data.sort((a: { id: string; }) => Number.parseInt(a.id))
  //
  // let nextIndex = 0
  //
  // if(query.next){
  //   //const findIndex = data.findIndex(data => data.id === query.next)
  //   const findIndex = data.findIndex((data: { id: string | undefined; }) => data.id === query.next)
  //   if(findIndex > 0){
  //     nextIndex = findIndex + 1
  //   } else {
  //     nextIndex = result.length
  //   }
  // }
  //
  // const schemes = result.slice(nextIndex, nextIndex + query.size)
  // return ApiPagedResponse.of(schemes, query.size, item => {
  //   return item.id
  // })

  //   return null
  // }

  /**
   * Get information about a vault with vault id.
   *
   * @param {string} id
   * @return {Promise<VaultDetails>}
   */
  @Get('/vault/:id')
  async get (@Param('id') id: string): Promise<VaultDetails> {
    try {
      return await this.client.loan.getVault(id)
    } catch (err) {
      console.log(err?.payload?.message)
      if (err?.payload?.message === `Vault <${id}> not found` ||
          err?.payload?.message === 'vaultId must be of length 64 (not 3, for \'999\')'
      ) {
        throw new NotFoundException('Unable to find vault')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}
