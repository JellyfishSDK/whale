import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceData, OracleState } from '@whale-api-client/api/oracle'
import BigNumber from 'bignumber.js'

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

        if (stack[0]?.type === 'OP_RETURN' && stack[0]?.code === 106) {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
            const timestamp: number = stack[1].tx.data.timestamp
            const oracleId: string = stack[1].tx.data.oracleId
            const tokens = stack[1].tx.data.tokens

            for (let i = 0; i < tokens.length; i += 1) {
              const token: string = tokens[i].token
              const prices = tokens[i].prices

              for (let j = 0; j < prices.length; j += 1) {
                const price = prices[j]

                const currency: string = price.currency
                const amount: number = price.amount

                records[`${oracleId}-${token}-${currency}-${block.height}-${timestamp.toString()}`] = OraclePriceDataIndexer.newOraclePriceData(block.height, oracleId, token, currency, new BigNumber(amount), timestamp, OracleState.LIVE)

                const priceDataResult = await this.mapper.getByOracleIdTokenCurrency(oracleId, token, currency) ?? []

                for (let k = 0; k < priceDataResult.length; k += 1) {
                  const priceDataObj = priceDataResult[k]

                  if (priceDataObj.state === OracleState.LIVE) {
                    const token = priceDataObj.data.token
                    const currency = priceDataObj.data.currency
                    const height = priceDataObj.block.height
                    const timestamp = priceDataObj.data.timestamp

                    priceDataObj.state = OracleState.REMOVED

                    records[`${oracleId}-${token}-${currency}-${height}-${timestamp.toString()}`] = priceDataObj
                  }
                }
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const tokenCurrencies: string[] = []
            const newTokenCurrenciesObj = stack[1].tx.data.priceFeeds ?? []

            for (let i = 0; i < newTokenCurrenciesObj.length; i += 1) {
              const tokenCurrencyObj = newTokenCurrenciesObj[i]

              const token: string = tokenCurrencyObj.token
              const currency: string = tokenCurrencyObj.currency

              tokenCurrencies.push(`${token}-${currency}`)
            }

            if (tokenCurrencies.length > 0) {
              const oracleId: string = stack[1].tx.data.oracleId
              const priceDataResult = await this.mapper.getByOracleId(oracleId) ?? []

              for (let i = 0; i < priceDataResult.length; i += 1) {
                const priceData = priceDataResult[i]
                const token = priceData.data.token
                const currency = priceData.data.currency

                if (priceData.state === OracleState.LIVE && !tokenCurrencies.includes(`${token}-${currency}`)) {
                  const height = priceData.block.height
                  const timestamp = priceData.data.timestamp

                  priceData.state = OracleState.REMOVED

                  records[`${oracleId}-${token}-${currency}-${height}-${timestamp.toString()}`] = priceData
                }
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const priceDataResult = await this.mapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < priceDataResult.length; i += 1) {
              const priceDataObj = priceDataResult[i]

              if (priceDataObj.state === OracleState.LIVE) {
                const token = priceDataObj.data.token
                const currency = priceDataObj.data.currency
                const height = priceDataObj.block.height
                const timestamp = priceDataObj.data.timestamp

                priceDataObj.state = OracleState.REMOVED

                records[`${oracleId}-${token}-${currency}-${height}-${timestamp.toString()}`] = priceDataObj
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
    const oraclePriceDataIds: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[0]?.type === 'OP_RETURN' && stack[0]?.code === 106) {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
            const timestamp: number = stack[1].tx.data.timestamp
            const oracleId: string = stack[1].tx.data.oracleId
            const tokens = stack[1].tx.data.tokens

            for (let i = 0; i < tokens.length; i += 1) {
              const token: string = tokens[i].token
              const prices = tokens[i].prices

              for (let y = 0; y < prices.length; y += 1) {
                const price = prices[y]
                const currency: string = price.currency

                oraclePriceDataIds.push(`${oracleId}-${token}-${currency}-${block.height}-${timestamp.toString()}`)
              }
            }
          }
        }
      }
    }

    for (const id of oraclePriceDataIds) {
      await this.mapper.delete(id)
    }
  }

  static newOraclePriceData (
    height: number,
    oracleId: string,
    token: string,
    currency: string,
    amount: BigNumber,
    timestamp: number,
    state: OracleState
  ): OraclePriceData {
    return {
      id: `${oracleId}-${token}-${currency}-${height}-${timestamp}`,
      block: {
        height
      },
      data: {
        oracleId,
        token,
        currency,
        amount,
        timestamp
      },
      state
    }
  }
}
