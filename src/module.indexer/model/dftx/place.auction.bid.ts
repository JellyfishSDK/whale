import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PlaceAuctionBid, CPlaceAuctionBid } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { VaultAuctionHistoryMapper } from '@src/module.model/vault.auction.batch.history'
import { VaultAuctionBatchBidMapper } from '@src/module.model/vault.auction.batch.bid'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class PlaceAuctionBidIndexer extends DfTxIndexer<PlaceAuctionBid> {
  OP_CODE: number = CPlaceAuctionBid.OP_CODE
  private readonly logger = new Logger(PlaceAuctionBidIndexer.name)

  constructor (
    private readonly vaultAuctionHistoryMapper: VaultAuctionHistoryMapper,
    private readonly vaultAuctionBatchBidMapper: VaultAuctionBatchBidMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data
    const from = toBuffer(data.from.stack).toString('hex')

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

    // TODO(canonbrother): due to the reason WIP on loanScheme and loan ops indexing
    // currently provides a temp solution first
    // FE req is to label, eg: Bid Lost, on auction listing page
    const batchBid = await this.vaultAuctionBatchBidMapper.get(`${data.vaultId}-${data.index}`)
    const froms = batchBid !== undefined ? batchBid.froms : []
    froms.push(from)
    await this.vaultAuctionBatchBidMapper.put({
      id: `${data.vaultId}-${data.index}`,
      froms: froms,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data

    await this.vaultAuctionHistoryMapper.delete(`${data.vaultId}-${data.index}-${transaction.txn.txid}`)
  }
}
