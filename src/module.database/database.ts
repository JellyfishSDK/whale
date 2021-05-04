import { Model } from '@src/module.database/models/_model'

/**
 * DeFi whale uses a database agnostic implementation. Any provider is valid as long as it
 * can conforms to the interfaces provided in Database. Superset implementations such as
 * RDMS are always support.
 *
 * For a performant design, the interface uses a log-structured merge-tree (LSM).
 * LSM uses a log data structure with performance characteristics that allows for high
 * write volume which is required for ledger based application. This database interface
 * implements a key-value structure with type, index, partition and sort as key.
 *
 * @see {Model} for more description and summary of what database implementation must conform to.
 */
export abstract class Database {
  abstract get<T extends Model> (
    type: typeof Model,
    index: string,
    partitionKey: string | number,
    sortKey?: string | number
  ): Promise<T | undefined>

  abstract query<T extends Model> (
    type: typeof Model,
    index: string,
    options: QueryOptions
  ): Promise<T[]>

  abstract put<T extends Model> (model: T): Promise<void>

  abstract delete<T extends Model> (model: T): Promise<void>
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface QueryOptions {
  /**
   * Provide to indicates searching on the sort index within partition key space.
   */
  partitionKey?: string | number
  limit: number
  order: SortOrder
  gt?: string | number
  gte?: string | number
  lt?: string | number
  lte?: string | number
}
