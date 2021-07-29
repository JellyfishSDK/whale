import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx.indexer'
import { AppointOracle, CAppointOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AppointOracleIndexer extends DfTxIndexer<AppointOracle> {
  OP_CODE: number = CAppointOracle.OP_CODE

  async index (block: RawBlock, txns: Array<DfTxTransaction<AppointOracle>>): Promise<void> {

  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<AppointOracle>>): Promise<void> {

  }
}
