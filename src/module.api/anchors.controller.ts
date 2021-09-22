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
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<AnchorData>> {
    const result = await this.rpcClient.spv.listAnchors()
    const anchors = result.map((anchor, index) => {
      return mapAnchors(index + 1, anchor)
    })
    return ApiPagedResponse.of(anchors, query.size, item => item.id)
  }
}

function mapAnchors (id: number, anchors: ListAnchorsResult): AnchorData {
  return {
    id: id.toString(),
    btcBlock: {
      height: anchors.btcBlockHeight,
      hash: anchors.btcBlockHash,
      txHash: anchors.btcTxHash
    },
    defiBlock: {
      height: anchors.defiBlockHeight,
      hash: anchors.defiBlockHash
    },
    previousAnchor: anchors.previousAnchor,
    rewardAddress: anchors.rewardAddress,
    confirmations: anchors.confirmations,
    signatures: anchors.signatures,
    active: anchors.active,
    anchorCreationHeight: anchors.anchorCreationHeight
  }
}
