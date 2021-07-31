import { Injectable } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from './oracle.price.aggregated'

/**
 * Assuming 30 second blocks, these classic provide a rough interval in which
 * prices are mapped, they are post-fixed by the block count interval
 *
 * e.g. OraclePriceAggregatedInverval10Mapper refers to a 5-minute interval
 */

// interface
export interface OraclePriceAggregatedIntervalMapper {
  interval: number
  put: (aggregated: OraclePriceAggregated) => Promise<void>
  delete: (id: string) => Promise<void>
}

// 5-minutes
@Injectable()
export class OraclePriceAggregatedInterval10Mapper extends OraclePriceAggregatedMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 10
}

// 10-minutes
@Injectable()
export class OraclePriceAggregatedInterval20Mapper extends OraclePriceAggregatedMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 20
}

// 1-hour
@Injectable()
export class OraclePriceAggregatedInterval120Mapper extends OraclePriceAggregatedMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 120
}

// 1-day
@Injectable()
export class OraclePriceAggregatedInterval2880Mapper extends OraclePriceAggregatedMapper
  implements OraclePriceAggregatedIntervalMapper {
  public readonly interval: number = 2880
}
