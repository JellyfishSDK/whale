import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx.indexer'
import { CSetOracleData, SetOracleData } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SetOracleDataIndexer extends DfTxIndexer<SetOracleData> {
  OP_CODE: number = CSetOracleData.OP_CODE

  async index (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): Promise<void> {
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): Promise<void> {
  }
}
