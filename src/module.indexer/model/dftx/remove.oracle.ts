import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx.indexer'
import { CRemoveOracle, RemoveOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'

@Injectable()
export class RemoveOracleIndexer extends DfTxIndexer<RemoveOracle> {
  OP_CODE: number = CRemoveOracle.OP_CODE

  async index (block: RawBlock, txns: Array<DfTxTransaction<RemoveOracle>>): Promise<void> {
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<RemoveOracle>>): Promise<void> {
  }
}
