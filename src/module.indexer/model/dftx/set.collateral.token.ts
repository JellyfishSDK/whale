import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CSetCollateralToken, SetCollateralToken } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { CollateralTokenMapper } from '@src/module.model/collateral.token'
import { TokenMapper } from '@src/module.model/token'
import { IndexerError } from '@src/module.indexer/error'

@Injectable()
export class SetCollateralTokenIndexer extends DfTxIndexer<SetCollateralToken> {
  OP_CODE: number = CSetCollateralToken.OP_CODE

  constructor (
    private readonly tokenMapper: TokenMapper,
    private readonly collateralTokenMapper: CollateralTokenMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<SetCollateralToken>>): Promise<void> {
    for (const txn of txns) {
      const setCollateralToken = txn.dftx.data
      const token = await this.tokenMapper.get(`${setCollateralToken.token}`)

      if (token === undefined) {
        throw new IndexerError(`Token id "${setCollateralToken.token}" referenced by SetCollateralToken do not exist`)
      }

      await this.collateralTokenMapper.put({
        id: `${setCollateralToken.token}-${block.height}`,
        sort: HexEncoder.encodeHeight(block.height),
        factor: setCollateralToken.factor.toFixed(),
        activateAfterBlock: setCollateralToken.activateAfterBlock,
        token: {
          id: setCollateralToken.token,
          symbol: token.symbol
        },
        priceFeed: `${setCollateralToken.currencyPair.token}/${setCollateralToken.currencyPair.currency}`,
        block: {
          hash: block.hash,
          height: block.height,
          time: block.time,
          medianTime: block.mediantime
        }
      })
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<SetCollateralToken>>): Promise<void> {
    for (const txn of txns) {
      const { token } = txn.dftx.data
      await this.collateralTokenMapper.delete(`${token}-${block.height}`)
    }
  }
}
