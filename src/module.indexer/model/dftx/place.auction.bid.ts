import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PlaceAuctionBid, CPlaceAuctionBid } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { VaultAuctionHistoryMapper } from '@src/module.model/vault.auction.batch.history'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { fromScriptHex } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'

@Injectable()
export class PlaceAuctionBidIndexer extends DfTxIndexer<PlaceAuctionBid> {
  OP_CODE: number = CPlaceAuctionBid.OP_CODE
  private readonly logger = new Logger(PlaceAuctionBidIndexer.name)

  constructor (
    @Inject('NETWORK') private readonly network: NetworkName,
    private readonly vaultAuctionHistoryMapper: VaultAuctionHistoryMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data
    const hex = toBuffer(data.from.stack).toString('hex')
    const from = fromScriptHex(hex, this.network)?.address as string

    await this.vaultAuctionHistoryMapper.put({
      id: `${data.vaultId}-${data.index}-${transaction.txn.txid}`,
      key: `${data.vaultId}-${data.index}`,
      sort: `${HexEncoder.encodeHeight(block.height)}-${transaction.txn.txid}`,
      vaultId: data.vaultId,
      index: data.index,
      from: from,
      amount: data.tokenAmount.amount.toString(),
      tokenId: data.tokenAmount.token,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data

    await this.vaultAuctionHistoryMapper.delete(`${data.vaultId}-${data.index}-${transaction.txn.txid}`)
  }
}
