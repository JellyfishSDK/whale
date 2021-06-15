import { blockchain } from '@defichain/jellyfish-api-core'

export type RawBlock = blockchain.Block<blockchain.Transaction>
export { blockchain as defid }

/**
 * An indexer must index/invalidate all specified model type.
 *
 * @example a block
 * @example all transactions in block
 * @example all transaction.vin in transaction
 * @example all transaction.vout in transaction
 */
export abstract class Indexer {
  abstract index (item: any): Promise<void>

  abstract invalidate (item: any): Promise<void>
}
