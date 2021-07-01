import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OraclePriceData, OraclePriceDataMapper } from '@src/module.model/oracle.priceData'

@Injectable()
export class OraclePriceDataIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceDataMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceData> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
          const timestamp = stack[1].tx.data.timestamp.toNumber()
          const oracleid: string = stack[1].tx.data.oracleId
          const data = stack[1].tx.data.tokens

          for (let i = 0; i < data.length; i += 1) {
            const token: string = data[i].token
            const prices = data[i].prices

            for (let y = 0; y < prices.length; y += 1) {
              const price = prices[y]

              const currency: string = price.currency
              const amount: number = price.amount

              records[`${oracleid}-${token}-${currency}`] = OraclePriceDataIndexer.newOraclePrice(block, oracleid, token, currency, amount, timestamp)
            }
          }
        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1].tx.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
          const oracleid: string = stack[1].tx.data.oracleId
          const data = stack[1].tx.data.tokens

          for (let i = 0; i < data.length; i += 1) {
            const token: string = data[i].token
            const prices = data[i].prices

            for (let y = 0; y < prices.length; y += 1) {
              const price = prices[y]

              const currency: string = price.currency

              await this.mapper.delete(`${oracleid}-${token}-${currency}`)
            }
          }
        }
      }
    }
  }

  static newOraclePrice (
    block: RawBlock,
    oracleid: string,
    token: string,
    currency: string,
    amount: number,
    timestamp: number
  ): OraclePriceData {
    return {
      id: `${oracleid}-${token}-${currency}`,
      block: {
        height: block.height
      },
      data: {
        timestamp,
        token,
        currency,
        oracleid,
        amount
      }
    }
  }
}
