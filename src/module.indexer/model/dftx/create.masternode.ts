import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CreateMasterNode, CCreateMasterNode } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { MasternodeMapper } from '@src/module.model/masternode'

@Injectable()
export class CreateMasternodeIndexer extends DfTxIndexer<CreateMasterNode> {
  OP_CODE: number = CCreateMasterNode.OP_CODE

  constructor (
    private readonly masternodeMapper: MasternodeMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<CreateMasterNode>>): Promise<void> {
    for (const { txn, dftx: { data } } of txns) {
      await this.masternodeMapper.put({
        id: txn.hash,
        // !TODO: Translate the pubkey hash into addresses
        ownerAddress: data.collateralPubKeyHash,
        operatorAddress: data.operatorPubKeyHash ?? data.collateralPubKeyHash,
        creationHeight: block.height,
        resignHeight: -1,
        mintedBlocks: 0,
        state: 'PRE_ENABLED',
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
