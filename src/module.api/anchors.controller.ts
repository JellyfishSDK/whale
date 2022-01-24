import { Controller, Get, Query } from '@nestjs/common'
import { ListAnchorsResult } from '@defichain/jellyfish-api-core/dist/category/spv'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { AnchorData } from '@whale-api-client/api/anchors'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'

@Controller('/anchors')
export class AnchorsController {
  constructor (
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  /**
   *  List anchors
   */
  @Get('')
  async list (
    @Query() query: PaginationQuery): Promise<ApiPagedResponse<AnchorData>> {
    const result = await this.rpcClient.spv.listAnchors({
      limit: Number(query.size),
      ...(query.next !== undefined) && { maxBtcHeight: Number(query.next) }
    })

    const anchors = result
      .map((anchor) => {
        return mapAnchors(anchor)
      })

    return ApiPagedResponse.of(anchors, query.size, item => (Number(item.id) - 1).toString())
  }
}

function mapAnchors (anchor: ListAnchorsResult): AnchorData {
  return {
    id: anchor.btcBlockHeight.toString(),
    btc: {
      block: {
        height: anchor.btcBlockHeight,
        hash: anchor.btcBlockHash
      },
      txn: {
        hash: anchor.btcTxHash
      },
      confirmations: anchor.confirmations
    },
    dfi: {
      block: {
        height: anchor.defiBlockHeight,
        hash: anchor.defiBlockHash
      }
    },
    previousAnchor: anchor.previousAnchor,
    rewardAddress: anchor.rewardAddress,
    signatures: anchor.signatures,
    active: anchor.active,
    anchorCreationHeight: anchor.anchorCreationHeight
  }
}
