import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PlaceAuctionBid, CPlaceAuctionBid } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { VaultAuctionHistoryMapper } from '@src/module.model/vault.auction.history'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { TokenMapper } from '@src/module.model/token'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class PlaceAuctionBidIndexer extends DfTxIndexer<PlaceAuctionBid> {
  OP_CODE: number = CPlaceAuctionBid.OP_CODE
  private readonly logger = new Logger(PlaceAuctionBidIndexer.name)

  constructor (
    private readonly tokenMapper: TokenMapper,
    private readonly vaultAuctionHistoryMapper: VaultAuctionHistoryMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data

    const token = await this.tokenMapper.get(`${data.tokenAmount.token}`)
    if (token === undefined) {
      throw new NotFoundIndexerError('index', 'PlaceAuctionBid', `${data.tokenAmount.token}`)
    }

    await this.vaultAuctionHistoryMapper.put({
      id: `${data.vaultId}-${data.index}-${transaction.txn.txid}`,
      key: `${data.vaultId}-${data.index}`,
      sort: HexEncoder.encodeHeight(block.height),
      vaultId: data.vaultId,
      index: data.index,
      from: toBuffer(data.from.stack).toString('hex'),
      amount: {
        token: data.tokenAmount.amount.toString(),
        currency: token.symbol
      },
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data

    await this.vaultAuctionHistoryMapper.delete(`${data.vaultId}-${data.index}-${transaction.txn.txid}`)
  }
}
