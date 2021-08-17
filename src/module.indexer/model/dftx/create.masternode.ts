import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CreateMasterNode, CCreateMasterNode } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { MasternodeMapper } from '@src/module.model/masternode'
import { NetworkName } from '@defichain/jellyfish-network'
import { P2PKH, P2WPKH } from '@defichain/jellyfish-address'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class CreateMasternodeIndexer extends DfTxIndexer<CreateMasterNode> {
  OP_CODE: number = CCreateMasterNode.OP_CODE
  private readonly logger = new Logger(CreateMasternodeIndexer.name)

  constructor (
    private readonly masternodeMapper: MasternodeMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<CreateMasterNode>>): Promise<void> {
    for (const { txn, dftx: { data } } of txns) {
      const ownerAddress = txn.vout[1].scriptPubKey.addresses[0]
      let operatorAddress = ownerAddress

      // This is actually the operatorPubKeyHash but jellyfish deserializes like so
      if (data.collateralPubKeyHash !== undefined) {
        if (data.type === MasternodeKeyType.PKHashType) {
          operatorAddress = P2PKH.to(this.network, data.collateralPubKeyHash).utf8String
        } else { // WitV0KeyHashType
          operatorAddress = P2WPKH.to(this.network, data.collateralPubKeyHash).utf8String
        }
      }

      await this.masternodeMapper.put({
        id: txn.txid,
        sort: HexEncoder.encodeHeight(block.height) + txn.txid,
        ownerAddress,
        operatorAddress,
        creationHeight: block.height,
        resignHeight: -1,
        mintedBlocks: 0,
        timelock: 0,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })
    }
  }

  async invalidate (_: RawBlock, txns: Array<DfTxTransaction<CreateMasterNode>>): Promise<void> {
    for (const { txn } of txns) {
      const masternodeId = txn.txid
      await this.masternodeMapper.delete(masternodeId)
    }
  }
}

enum MasternodeKeyType {
  PKHashType = 1,
  WitV0KeyHashType = 4
}
