import { Controller, Get } from '@nestjs/common'
import { ListAnchorsResult } from '@defichain/jellyfish-api-core/dist/category/spv'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { AnchorData } from '@whale-api-client/api/anchors'

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
  async list (): Promise<AnchorData[]> {
    const result = await this.rpcClient.spv.listAnchors()
    return result.map(anchor => {
      return mapAnchors(anchor)
    })
  }
}

function mapAnchors (anchors: ListAnchorsResult): AnchorData {
  return {
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
