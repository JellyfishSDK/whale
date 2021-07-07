import { Global, Module } from '@nestjs/common'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { BlockMapper } from '@src/module.model/block'
import { ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper } from '@src/module.model/transaction.vout'
import { TokenMapper } from '@src/module.model/token'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { DctIdMapper } from '@src/module.model/dctid'
import { ModelProbeIndicator } from '@src/module.model/_model.probes'

@Global()
@Module({
  providers: [
    ModelProbeIndicator,
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper,
    TokenMapper,
    PoolPairMapper,
    DctIdMapper
  ],
  exports: [
    ModelProbeIndicator,
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper,
    TokenMapper,
    PoolPairMapper,
    DctIdMapper
  ]
})
export class ModelModule {
}
