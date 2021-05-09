import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { ScriptAggregation, ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { VoutFinder } from '@src/module.indexer/model/_vout_finder'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class ScriptAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: ScriptAggregationMapper,
    private readonly voutFinder: VoutFinder
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, ScriptAggregation> = {}

    function findScriptAggregation (hex: string, type: string): ScriptAggregation {
      const hid = HexEncoder.asSHA256(hex)
      if (records[hid] === undefined) {
        records[hid] = ScriptAggregationIndexer.newScriptAggregation(block, hex, type)
      }
      return records[hid]
    }

    for (const txn of block.tx) {
      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined) {
          continue
        }

        const vout = await this.voutFinder.findVout(block, vin.txid, vin.vout)
        if (vout === undefined) {
          throw new NotFoundIndexerError('index', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
        }

        // Spent (REMOVE)
        const aggregation = findScriptAggregation(vout.script.hex, vout.script.type)
        aggregation.statistic.tx_out_count += 1
        aggregation.amount.tx_out = new BigNumber(aggregation.amount.tx_out).plus(vout.value).toFixed(8)
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        // Unspent (ADD)
        const aggregation = findScriptAggregation(vout.scriptPubKey.hex, vout.scriptPubKey.type)
        aggregation.statistic.tx_in_count += 1
        aggregation.amount.tx_in = new BigNumber(aggregation.amount.tx_in).plus(vout.value).toFixed(8)
      }
    }

    for (const aggregation of Object.values(records)) {
      const latest = await this.mapper.getLatest(aggregation.hid)
      if (latest !== undefined) {
        aggregation.statistic.tx_in_count += latest.statistic.tx_in_count
        aggregation.statistic.tx_out_count += latest.statistic.tx_out_count

        aggregation.amount.tx_in = new BigNumber(aggregation.amount.tx_in).plus(latest.amount.tx_in).toFixed(8)
        aggregation.amount.tx_out = new BigNumber(aggregation.amount.tx_out).plus(latest.amount.tx_out).toFixed(8)
      }

      aggregation.statistic.tx_count = aggregation.statistic.tx_in_count + aggregation.statistic.tx_out_count
      aggregation.amount.unspent = new BigNumber(aggregation.amount.tx_in).minus(aggregation.amount.tx_out).toFixed(8)

      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const hidList = new Set<string>()

    for (const txn of block.tx) {
      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined) {
          continue
        }

        const vout = await this.voutFinder.findVout(block, vin.txid, vin.vout)
        if (vout === undefined) {
          throw new NotFoundIndexerError('invalidate', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
        }
        hidList.add(HexEncoder.asSHA256(vout.script.hex))
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        hidList.add(HexEncoder.asSHA256(vout.scriptPubKey.hex))
      }
    }

    for (const hid of hidList) {
      await this.mapper.delete(HexEncoder.encodeHeight(block.height) + hid)
    }
  }

  static newScriptAggregation (block: RawBlock, hex: string, type: string): ScriptAggregation {
    const hid = HexEncoder.asSHA256(hex)

    return {
      id: HexEncoder.encodeHeight(block.height) + hid,
      hid: hid,
      block: {
        hash: block.hash,
        height: block.height
      },
      script: {
        type: type,
        hex: hex
      },
      statistic: {
        tx_count: 0,
        tx_in_count: 0,
        tx_out_count: 0
      },
      amount: {
        tx_in: '0.00000000',
        tx_out: '0.00000000',
        unspent: '0.00000000'
      }
    }
  }
}
