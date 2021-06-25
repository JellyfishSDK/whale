import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import BigNumber from 'bignumber.js'
import { OraclePriceAggregation, OraclePriceAggregationMapper } from '@src/module.model/oracle.price.aggregation'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceAggregationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceAggregation> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        try {
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          if (stack[1].tx.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
            const timestamp = stack[1].tx.data.timestamp
            const data = stack[1].tx.data.tokens

            for (let i = 0; i < data.length; i += 1) {
              const token: string = data[i].token
              const prices = data[i].prices

              for (let y = 0; y < prices.length; y += 1) {
                const price = prices[y]

                const currency: string = price.currency
                const amount = price.amount
                records[`${token}-${currency}-${block.height.toString()}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block, vout.scriptPubKey.hex, vout.scriptPubKey.type, token, currency, amount, timestamp)
              }
            }
          }
        } catch (e) {

        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    // const hidList = new Set<string>()
    //
    // for (const txn of block.tx) {
    //   for (const vout of txn.vout) {
    //     hidList.add(HexEncoder.asSHA256(vout.scriptPubKey.hex))
    //   }
    // }
    //
    // for (const hid of hidList) {
    //   await this.mapper.delete(HexEncoder.encodeHeight(block.height) + hid)
    // }
  }

  static newOraclePriceAggregation (
    block: RawBlock,
    hex: string,
    type: string,
    token: string,
    currency: string,
    amount: BigNumber,
    timestamp: BigNumber
  ): OraclePriceAggregation {
    const hid = HexEncoder.asSHA256(hex)

    return {
      id: `${token}-${currency}-${block.height.toString()}`,
      hid: hid,
      block: {
        hash: block.hash,
        height: block.height
      },
      script: {
        type: type,
        hex: hex
      },
      data: {
        token,
        currency,
        amount,
        timestamp
      }
    }
  }
}
