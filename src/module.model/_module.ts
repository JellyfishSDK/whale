import { Global, Module } from '@nestjs/common'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { BlockMapper } from '@src/module.model/block'
import { ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper } from '@src/module.model/transaction.vout'
import { OracleWeightageMapper } from '@src/module.model/oracle.weightage'
import { OraclePriceMapper } from '@src/module.model/oracle.price'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'

@Global()
@Module({
  providers: [
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper,
    OracleWeightageMapper,
    OraclePriceFeedMapper,
    OraclePriceMapper,
    OraclePriceAggregrationMapper
  ],
  exports: [
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper,
    OracleWeightageMapper,
    OraclePriceFeedMapper,
    OraclePriceMapper,
    OraclePriceAggregrationMapper
  ]
})
export class ModelModule {
}
