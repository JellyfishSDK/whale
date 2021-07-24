import { Global, Module } from '@nestjs/common'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { BlockMapper } from '@src/module.model/block'
import { ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper } from '@src/module.model/transaction.vout'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import { ModelProbeIndicator } from '@src/module.model/_model.probes'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'

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
    OracleAppointedMapper,
    OraclePriceDataMapper,
    OraclePriceAggregrationMapper
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
    OracleAppointedMapper,
    OraclePriceDataMapper,
    OraclePriceAggregrationMapper
  ]
})
export class ModelModule {
}
