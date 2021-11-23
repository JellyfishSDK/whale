import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from '@src/module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '@src/module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '@src/module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '@src/module.indexer/model/dftx/set.oracle.data'
import { SetOracleDataIntervalIndexer } from '@src/module.indexer/model/dftx/set.oracle.data.interval'
import { CreateMasternodeIndexer } from '@src/module.indexer/model/dftx/create.masternode'
import { ResignMasternodeIndexer } from '@src/module.indexer/model/dftx/resign.masternode'
import { CreateTokenIndexer } from '@src/module.indexer/model/dftx/create.token'
import { CreatePoolPairIndexer } from '@src/module.indexer/model/dftx/create.poolpair'
import { UpdatePoolPairIndexer } from '@src/module.indexer/model/dftx/update.poolpair'
import { NetworkName } from '@defichain/jellyfish-network'
import { ConfigService } from '@nestjs/config'
import { SetLoanTokenIndexer } from '@src/module.indexer/model/dftx/set.loan.token'
import { ActivePriceIndexer } from '@src/module.indexer/model/dftx/active.price'
import { SetLoanSchemeIndexer } from '@src/module.indexer/model/dftx/set.loan.scheme'
import { SetDeferredLoanSchemeIndexer } from '@src/module.indexer/model/dftx/set.deferred.loan.scheme'
import { DestroyLoanSchemeIndexer } from '@src/module.indexer/model/dftx/destroy.loan.scheme'
import { DestroyDeferredLoanSchemeIndexer } from '@src/module.indexer/model/dftx/destroy.deferred.loan.scheme'
import { SetDefaultLoanSchemeIndexer } from '@src/module.indexer/model/dftx/set.default.loan.scheme'

const indexers = [
  AppointOracleIndexer,
  RemoveOracleIndexer,
  SetOracleDataIndexer,
  UpdateOracleIndexer,
  CreateMasternodeIndexer,
  ResignMasternodeIndexer,
  SetOracleDataIntervalIndexer,
  CreateTokenIndexer,
  CreatePoolPairIndexer,
  UpdatePoolPairIndexer,
  SetLoanTokenIndexer,
  ActivePriceIndexer,
  SetLoanSchemeIndexer,
  SetDeferredLoanSchemeIndexer,
  DestroyLoanSchemeIndexer,
  DestroyDeferredLoanSchemeIndexer,
  SetDefaultLoanSchemeIndexer
]

@Module({
  providers: [...indexers,
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    }],
  exports: indexers
})
export class DfTxIndexerModule {
}
