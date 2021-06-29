import { Injectable } from '@nestjs/common'
import { PoolSwapAggregation, PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { Indexer, RawBlock } from './_abstract'
import { OP_DEFI_TX } from '@defichain/jellyfish-transaction/dist/script/defi'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'

@Injectable()
export class PoolSwapAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: PoolSwapAggregationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
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
        const poolId = constructPoolId(data.fromTokenId, data.toTokenId)
        const bucketId = roundMinutes(block.time)
        const id = constructId(poolId, bucketId)

        let aggregation = await this.mapper.get(id)
        if (aggregation === undefined) {
          console.log('aggregation undefined: ', aggregation)
          aggregation = PoolSwapAggregationIndexer.newPoolSwapAggregation(poolId, bucketId)
        }

        aggregation.total = new BigNumber(aggregation.total).plus(data.fromAmount)
        aggregation.count += 1

        console.log('aggregation: ', aggregation)

        await this.mapper.put(aggregation)

        // manually add 1 here and test query
        const testagg = PoolSwapAggregationIndexer.newPoolSwapAggregation(poolId, '2020-08-31T19:20')
        await this.mapper.put(testagg)

        const testagg1 = await this.mapper.get(testagg.id)
        console.log('testagg1: ', testagg1)

        // check whether the aggregation above is stored into db - yes, but 'test' get undefined
        const testget = await this.mapper.get(id)
        console.log('testget: ', testget)

        // query here is working correctly
        // but query in test only return only the manual added data
        const testquery = await this.mapper.query(poolId, 100)
        console.log('testquery: ', testquery)
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547873')) {
          continue
        }
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data = (stack[1] as OP_DEFI_TX).tx.data
        const poolId = constructPoolId(data.fromTokenId, data.toTokenId)
        const bucketId = roundMinutes(block.time)
        const id = constructId(poolId, bucketId)

        await this.mapper.delete(id)
      }
    }
  }

  static newPoolSwapAggregation (poolId: string, bucketId: string): PoolSwapAggregation {
    return {
      id: constructId(poolId, bucketId),
      // id: poolId,
      poolId: poolId,
      bucketId: bucketId,
      total: new BigNumber('0'),
      count: 0
    }
  }
}

function roundMinutes (timestamp: number): string {
  const ts = String(timestamp).length === 10 ? timestamp * 1000 : timestamp

  // date in ISO string - 2020-04-01T15:00:323Z
  const dateTime = new Date(new Date(ts).setMinutes(0)).toISOString()

  // remove seconds and milliseconds
  return dateTime.substr(0, dateTime.length - 8)
}

function constructId (poolId: string, bucketId: string): string {
  return `${poolId}_${bucketId}`
}

function constructPoolId (fromTokenId: string, toTokenId: string): string {
  return `${fromTokenId}-${toTokenId}`
}
