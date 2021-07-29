import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx.indexer'
import { CUpdateOracle, UpdateOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UpdateOracleIndexer extends DfTxIndexer<UpdateOracle> {
  OP_CODE: number = CUpdateOracle.OP_CODE

  async index (block: RawBlock, txns: Array<DfTxTransaction<UpdateOracle>>): Promise<void> {

  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<UpdateOracle>>): Promise<void> {

  }
}
