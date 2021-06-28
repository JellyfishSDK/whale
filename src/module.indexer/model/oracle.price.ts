import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OraclePrice, OraclePriceMapper } from '@src/module.model/oracle.price'

@Injectable()
export class OraclePriceIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePrice> = {}

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
            const timestamp = Math.floor(stack[1].tx.data.timestamp.toNumber() / 1000)
            const oracleid: string = stack[1].tx.data.oracleId
            const data = stack[1].tx.data.tokens

            for (let i = 0; i < data.length; i += 1) {
              const token: string = data[i].token
              const prices = data[i].prices

              for (let y = 0; y < prices.length; y += 1) {
                const price = prices[y]

                const currency: string = price.currency
                const amount: number = price.amount

                records[`${oracleid}-${token}-${currency}`] = OraclePriceIndexer.newOraclePrice(block, oracleid, timestamp, token, currency, amount)
                // console.log(`${oracleid}-${token}-${currency}`)
              }
            }
          }
        } catch (e) {

        }
      }
    }

    for (const aggregation of Object.values(records)) {
      // console.log(aggregation)
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

  static newOraclePrice (
    block: RawBlock,
    oracleid: string,
    timestamp: number,
    token: string,
    currency: string,
    amount: number
  ): OraclePrice {
    return {
      id: `${oracleid}-${token}-${currency}`,
      block: {
        height: block.height
      },
      data: {
        oracleid,
        timestamp,
        token,
        currency,
        amount
      }
    }
  }
}
