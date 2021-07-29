import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from '@src/module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '@src/module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '@src/module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '@src/module.indexer/model/dftx/set.oracle.data'

@Module({
  providers: [
    AppointOracleIndexer,
    RemoveOracleIndexer,
    SetOracleDataIndexer,
    UpdateOracleIndexer
  ]
})
export class DfTxIndexerModule {
}
