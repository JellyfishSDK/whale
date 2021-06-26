import { Injectable } from '@nestjs/common'
import { PoolSwapAggregation, PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { Indexer, RawBlock } from './_abstract'
import { OP_DEFI_TX } from '@defichain/jellyfish-transaction/dist/script/defi'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import { tsToDateTime } from '@src/utils'
import BigNumber from 'bignumber.js'

@Injectable()
export class PoolSwapAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: PoolSwapAggregationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    // console.log('block: ', block)
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        // grab poolswap tx only
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547873')) {
          continue
        }
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data = (stack[1] as OP_DEFI_TX).tx.data

        const { date, hours } = tsToDateTime(block.time * 1000)

        let aggregation = await this.mapper.get(date)
        if (aggregation === undefined) {
          aggregation = PoolSwapAggregationIndexer.newPoolSwapAggregation(date)
        }
        aggregation.bucket[hours].total = new BigNumber(aggregation.bucket[hours].total).plus(data.fromAmount)
        aggregation.bucket[hours].count += 1
        await this.mapper.put(aggregation)
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a4466547873')) {
          continue
        }
        const { date } = tsToDateTime(block.time)
        await this.mapper.delete(date)
      }
    }
  }

  static newPoolSwapAggregation (date: string): PoolSwapAggregation {
    return {
      id: date,
      bucket: {
        '00': { total: new BigNumber('0'), count: 0 },
        '01': { total: new BigNumber('0'), count: 0 },
        '02': { total: new BigNumber('0'), count: 0 },
        '03': { total: new BigNumber('0'), count: 0 },
        '04': { total: new BigNumber('0'), count: 0 },
        '05': { total: new BigNumber('0'), count: 0 },
        '06': { total: new BigNumber('0'), count: 0 },
        '07': { total: new BigNumber('0'), count: 0 },
        '08': { total: new BigNumber('0'), count: 0 },
        '09': { total: new BigNumber('0'), count: 0 },
        10: { total: new BigNumber('0'), count: 0 },
        11: { total: new BigNumber('0'), count: 0 },
        12: { total: new BigNumber('0'), count: 0 },
        13: { total: new BigNumber('0'), count: 0 },
        14: { total: new BigNumber('0'), count: 0 },
        15: { total: new BigNumber('0'), count: 0 },
        16: { total: new BigNumber('0'), count: 0 },
        17: { total: new BigNumber('0'), count: 0 },
        18: { total: new BigNumber('0'), count: 0 },
        19: { total: new BigNumber('0'), count: 0 },
        20: { total: new BigNumber('0'), count: 0 },
        21: { total: new BigNumber('0'), count: 0 },
        22: { total: new BigNumber('0'), count: 0 },
        23: { total: new BigNumber('0'), count: 0 }
      }
    }
  }
}
