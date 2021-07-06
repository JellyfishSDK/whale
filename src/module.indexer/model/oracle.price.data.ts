import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceData, OracleState } from '@whale-api-client/api/oracle'

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

        if (stack[0]?.type === 'OP_RETURN' || stack[0]?.code === '106') {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const oracles = await this.mapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < oracles.length; i += 1) {
              const oracle = oracles[i]
              const token = oracle.data.token
              const currency = oracle.data.currency
              const amount = oracle.data.amount
              const height = oracle.block.height
              const timestamp = oracle.data.timestamp

              if (oracle.state === 'REMOVED') {
                continue
              }

              records[`${oracleId}-${token}-${currency}-${height}-${timestamp}`] = OraclePriceDataIndexer.newOraclePriceData(height, oracleId, token, currency, amount, timestamp, OracleState.REMOVED)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const priceSet = new Set()
            const newPriceFeeds = stack[1].tx.data.priceFeeds ?? []

            for (let i = 0; i < newPriceFeeds.length; i += 1) {
              const priceFeed = newPriceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              priceSet.add(`${token}-${currency}`)
            }

            if (priceSet.size > 0) {
              const oracleId: string = stack[1].tx.data.oracleId
              const oracles = await this.mapper.getByOracleId(oracleId) ?? []

              for (let i = 0; i < oracles.length; i += 1) {
                const oracle = oracles[i]
                const token = oracle.data.token
                const currency = oracle.data.currency
                const amount = oracle.data.amount
                const height = oracle.block.height
                const timestamp = oracle.data.timestamp

                if (priceSet.has(`${token}-${currency}`) || oracle.state === 'REMOVED') {
                  continue
                }

                records[`${oracleId}-${token}-${currency}-${height}-${timestamp}`] = OraclePriceDataIndexer.newOraclePriceData(height, oracleId, token, currency, amount, timestamp, OracleState.REMOVED)
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
            const timestamp = stack[1].tx.data.timestamp.toNumber()
            const oracleId: string = stack[1].tx.data.oracleId
            const data = stack[1].tx.data.tokens

            for (let i = 0; i < data.length; i += 1) {
              const token: string = data[i].token
              const prices = data[i].prices

              for (let y = 0; y < prices.length; y += 1) {
                const price = prices[y]

                const currency: string = price.currency
                const amount: number = price.amount

                records[`${oracleId}-${token}-${currency}-${block.height}-${block.time}`] = OraclePriceDataIndexer.newOraclePriceData(block.height, oracleId, token, currency, amount, timestamp, OracleState.LIVE)

                const oracles = await this.mapper.getByOracleIdTokenCurrency(oracleId, token, currency) ?? []

                for (let i = 0; i < oracles.length; i += 1) {
                  const oracle = oracles[i]
                  const token = oracle.data.token
                  const currency = oracle.data.currency
                  const amount = oracle.data.amount
                  const height = oracle.block.height
                  const timestamp = oracle.data.timestamp

                  if (oracle.state === 'REMOVED') {
                    continue
                  }

                  records[`${oracleId}-${token}-${currency}-${height}-${timestamp}`] = OraclePriceDataIndexer.newOraclePriceData(height, oracleId, token, currency, amount, timestamp, OracleState.REMOVED)
                }
              }
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
    // for (const txn of block.tx) {
    //   for (const vout of txn.vout) {
    //     if (!vout.scriptPubKey.hex.startsWith('6a')) {
    //       continue
    //     }
    //
    //     const stack: any = toOPCodes(
    //       SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
    //     )
    //
    //     if (stack[1].tx.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
    //       const oracleId: string = stack[1].tx.data.oracleId
    //       const data = stack[1].tx.data.tokens
    //
    //       for (let i = 0; i < data.length; i += 1) {
    //         const token: string = data[i].token
    //         const prices = data[i].prices
    //
    //         for (let y = 0; y < prices.length; y += 1) {
    //           const price = prices[y]
    //           const currency: string = price.currency
    //           await this.mapper.delete(`${oracleId}-${token}-${currency}-${block.height}`)
    //         }
    //       }
    //     }
    //   }
    // }
  }

  static newOraclePriceData (
    height: number,
    oracleId: string,
    token: string,
    currency: string,
    amount: number,
    timestamp: number,
    state: OracleState
  ): OraclePriceData {
    return {
      id: `${oracleId}-${token}-${currency}-${height}-${timestamp}`,
      block: {
        height
      },
      data: {
        timestamp,
        token,
        currency,
        oracleId,
        amount
      },
      state
    }
  }
}
