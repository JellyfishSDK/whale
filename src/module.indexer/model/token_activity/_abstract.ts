import { ScriptActivity, ScriptActivityMapper, ScriptActivityTypeHex } from '@src/module.model/script.activity'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { DfTxTransaction } from '../dftx/_abstract'
import { RawBlock } from '../_abstract'

/**
 * activity types from 1 script perspective
 * eg: account to account (from script A to B), type naming TBD
 * A: spend-account-to-account
 * B: account-to-account-gain
 */
export type ScriptTokenActivityType = 'spend-account-to-account' | 'account-to-account-gain' | 'utxos-to-account-gain'

export interface ScriptTokenActivity {
  script: {
    type: string
    hex: string
  }
  type: ScriptTokenActivityType
  tokenId: number
  value: string
}

export abstract class TokenActivityIndexer<T> {
  abstract OP_CODE: number

  constructor (
    private readonly mapper: ScriptActivityMapper
  ) {
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<T>>): Promise<void> {
    let i = 0
    for (const txn of txns) {
      const activities = await this.extractTokenActivities(txn.dftx.data)
      for (const activity of activities) {
        const simpleScriptActivity = this.mapToGenericScriptActivity(block, txn, activity, i++)
        await this.mapper.put(simpleScriptActivity)
      }
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<T>>): Promise<void> {
    for (const txn of txns) {
      const activities = await this.extractTokenActivities(txn.dftx.data)
      for (let i = 0; i < activities.length; i++) {
        const id = this.mapId(block, txn.txn.txid, i)
        await this.mapper.delete(id)
      }
    }
  }

  abstract extractTokenActivities (tx: T): Promise<ScriptTokenActivity[]>

  mapToGenericScriptActivity (block: RawBlock, dfTx: DfTxTransaction<any>, tokenSA: ScriptTokenActivity, activitySerialNumber: number): ScriptActivity {
    return {
      id: this.mapId(block, dfTx.txn.txid, activitySerialNumber),
      hid: HexEncoder.asSHA256(tokenSA.script.hex),
      type: tokenSA.type,
      typeHex: ScriptActivityTypeHex.DFTX,
      txid: dfTx.txn.txid,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      script: tokenSA.script,
      value: tokenSA.value,
      tokenId: tokenSA.tokenId
    }
  }

  mapId (block: RawBlock, txid: string, n: number): string {
    const height = HexEncoder.encodeHeight(block.height)
    const typeHex = ScriptActivityTypeHex.DFTX
    // TBD: may reduce encoding to simpler number to reduce indexing workload
    const index = HexEncoder.encodeVoutIndex(n)
    return `${height}${typeHex}${txid}${index}`
  }
}
