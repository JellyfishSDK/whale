import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { TokenCreate, CTokenCreate } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { DCT_ID_START, TokenMapper } from '@src/module.model/token'
import BigNumber from 'bignumber.js'

@Injectable()
export class CreateTokenIndexer extends DfTxIndexer<TokenCreate> {
  OP_CODE: number = CTokenCreate.OP_CODE
  private readonly logger = new Logger(CreateTokenIndexer.name)

  constructor (
    private readonly tokenMapper: TokenMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<TokenCreate>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenId = await this.getNextTokenID(data.isDAT)
      await this.tokenMapper.put({
        id: `${tokenId}`,
        sort: HexEncoder.encodeHeight(tokenId),
        symbol: data.symbol,
        name: data.name,
        isDAT: data.isDAT,
        isLPS: false,
        limit: data.limit.toFixed(8),
        mintable: data.mintable,
        decimal: data.decimal,
        tradeable: data.tradeable,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })
    }
  }

  async invalidate (_: RawBlock, txns: Array<DfTxTransaction<TokenCreate>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenId = await this.getNextTokenID(data.isDAT)
      await this.tokenMapper.delete(`${tokenId - 1}`)
    }
  }

  async getNextTokenID (isDAT: boolean): Promise<number> {
    const latest = isDAT ? await this.tokenMapper.getLatestDAT()
      : await this.tokenMapper.getLatestDST()

    if (latest === undefined) {
      // Default to 1 as 0 is reserved for DFI
      return isDAT ? 1 : DCT_ID_START
    }

    if (isDAT && !(new BigNumber(latest.id).lt(DCT_ID_START - 1))) {
      const latestDST = await this.tokenMapper.getLatestDST()
      return latestDST !== undefined ? new BigNumber(latestDST.id).plus(1).toNumber() : DCT_ID_START
    }

    return new BigNumber(latest.id).plus(1).toNumber()
  }
}
