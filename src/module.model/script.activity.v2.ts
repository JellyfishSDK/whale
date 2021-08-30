import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { ScriptTokenActivityType } from '@src/module.indexer/model/token_activity/_abstract'

const ScriptActivityV2Mapping: ModelMapping<ScriptActivityV2> = {
  type: 'script_activity_v2',
  index: {
    hid_id: {
      name: 'script_activity_v2_hid_id',
      partition: {
        type: 'string',
        key: (d: ScriptActivityV2) => d.hid
      },
      sort: {
        type: 'string',
        key: (d: ScriptActivityV2) => d.id
      }
    }
  }
}

@Injectable()
export class ScriptActivityV2Mapper {
  public constructor (protected readonly database: Database) {
  }

  async query (hid: string, limit: number, lt?: string): Promise<ScriptActivityV2[]> {
    return await this.database.query(ScriptActivityV2Mapping.index.hid_id, {
      partitionKey: hid,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (activity: ScriptActivityV2): Promise<void> {
    return await this.database.put(ScriptActivityV2Mapping, activity)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(ScriptActivityV2Mapping, id)
  }

  async insert (activity: ScriptActivityV2): Promise<void> {
    const existing = this.database.get(ScriptActivityV2Mapping.index.hid_id, activity.hid, activity.id)
    if (existing !== undefined) {
      throw new Error('Unique id existed')
    }
    return await this.put(activity)
  }
}

// TODO(@ivan-zynesis): future improvement, vin|vout should be imported as ScriptUtxoActivityType from ScriptActivityIndexer
// there are more detail can be extracted from utxo type transaction (fee spent, send, receive, mining reward)
export type ScriptActivityV2Type = 'vin' | 'vout' | ScriptTokenActivityType
export type ScriptActivityCategory = 'utxo' | 'dftx'

/**
 * Script moving activity
 */
export interface ScriptActivityV2 extends Model {
  id: string // ----------------| unique id of this output: block height, txid, X(serial number of an "activity" within a txid)
  hid: string // ---------------| hashed id, for length compatibility reasons this is the hashed id of script
  txid: string // --------------| txn that created the script activity

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  script: {
    type: string
    hex: string
  }

  value: string // -------------| output value stored as string, string as decimal: 0.0000
  tokenId: number // -----------| 0: DFI, 1: BTC, etc
  type: ScriptActivityV2Type

  category: ScriptActivityCategory

  utxo?: {
    txid: string
    n: number
  }
}
