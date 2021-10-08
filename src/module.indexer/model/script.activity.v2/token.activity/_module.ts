import { Module } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import { ConfigService } from '@nestjs/config'
import { AccountToAccountIndexer } from './account/account.to.account'
import { AccountToUtxosIndexer } from './account/account.to.utxos'
import { AnyAccountToAccountIndexer } from './account/any.account.to.account'
import { UtxosToAccountIndexer } from './account/utxos.to.account'
import { AddLiquidityIndexer } from './dex/add.liquidity'
import { PoolSwapIndexer } from './dex/poolswap'
import { RemoveLiquidityIndexer } from './dex/remove.liquidity'

const indexers = [
  AccountToAccountIndexer,
  AccountToUtxosIndexer,
  AnyAccountToAccountIndexer,
  UtxosToAccountIndexer,
  AddLiquidityIndexer,
  PoolSwapIndexer,
  RemoveLiquidityIndexer
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
export class ScriptActivityV2IndexerModule {
}
