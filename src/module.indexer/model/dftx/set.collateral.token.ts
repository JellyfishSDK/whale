import { CSetCollateralToken, SetCollateralToken } from '@defichain/jellyfish-transaction'
import { CollateralToken, CollateralTokenMapper } from '@src/module.model/collateral.token'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { TokenMapper } from '@src/module.model/token'
import { IndexerError } from '@src/module.indexer/error'
import { DeferableIndexer } from './_deferred'
import { Database } from '@src/module.database/database'

@Injectable()
export class SetCollateralTokenIndexer extends DeferableIndexer<CollateralToken, SetCollateralToken> {
  OP_CODE: number = CSetCollateralToken.OP_CODE

  constructor (
    private readonly database: Database,
    private readonly tokenMapper: TokenMapper,
    private readonly collateralTokenMapper: CollateralTokenMapper
  ) {
    super(collateralTokenMapper)
  }

  async mapDfTxToModel (dftx: SetCollateralToken, block: RawBlock): Promise<CollateralToken> {
    const token = await this.tokenMapper.get(`${dftx.token}`)
    if (token === undefined) {
      throw new IndexerError(`Token with id ${dftx.token} referenced and not found`)
    }

    return {
      id: `${dftx.token}`,
      factor: dftx.factor.toFixed(),
      token: {
        id: dftx.token,
        symbol: token.symbol
      },
      tokenCurrency: `${dftx.currencyPair.token}-${dftx.currencyPair.currency}`,

      uniqueKey: `${dftx.token}`,
      activationHeight: dftx.activateAfterBlock,
      block: {
        height: block.height,
        hash: block.hash,
        medianTime: block.mediantime,
        time: block.time
      }
    }
  }
}
