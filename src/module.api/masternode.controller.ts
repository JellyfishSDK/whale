import { NotFoundException, Controller, Get, Query, Param, BadRequestException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { MasternodeData } from '@whale-api-client/api/masternode'
import { MasternodePagination, MasternodeInfo } from '@defichain/jellyfish-api-core/dist/category/masternode'

@Controller('/v0/:network/masternodes')
export class MasternodeController {
  constructor (
    protected readonly client: JsonRpcClient
  ) {
  }

  /**
   *  Paginate masternode list.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<MasternodeData>>}
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<any> {
    const options: MasternodePagination = {
      including_start: query.next === undefined,
      limit: query.size
    }

    if (query.next !== undefined) options.start = query.next

    const data = await this.client.masternode.listMasternodes(options, true)

    const masternodes: MasternodeData[] = Object.entries(data)
      .map(([id, value]): MasternodeData => mapMasternodeData(id, value))

    return ApiPagedResponse.of(masternodes, query.size, item => item.id)
  }

  /**
   * Queries a masternode with given id
   *
   * @param {string} id
   * @return {Promise<MasternodeData>}
   */

  @Get('/:id')
  async get (@Param('id') id: string): Promise<MasternodeData> {
    try {
      const data = await this.client.masternode.getMasternode(id)
      return mapMasternodeData(id, data[Object.keys(data)[0]])
    } catch (err) {
      if (err?.payload?.message === 'Masternode not found') {
        throw new NotFoundException('Unable to find masternode')
      } else {
        throw new BadRequestException(err)
      }
    }
  }
}

function mapMasternodeData (id: string, MasternodeInfo: MasternodeInfo): MasternodeData {
  return {
    id: id,
    ownerAuthAddress: MasternodeInfo.ownerAuthAddress,
    operatorAuthAddress: MasternodeInfo.operatorAuthAddress,
    creationHeight: MasternodeInfo.creationHeight,
    resignHeight: MasternodeInfo.resignHeight,
    resignTx: MasternodeInfo.resignTx,
    banHeight: MasternodeInfo.banHeight,
    banTx: MasternodeInfo.banTx,
    state: MasternodeInfo.state,
    mintedBlocks: MasternodeInfo.mintedBlocks,
    ownerIsMine: MasternodeInfo.ownerIsMine,
    operatorIsMine: MasternodeInfo.operatorIsMine,
    localMasternode: MasternodeInfo.localMasternode
  }
}
