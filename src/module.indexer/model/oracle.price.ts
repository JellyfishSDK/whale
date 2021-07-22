import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointedWeightageMapper } from '@src/module.model/oracle.appointed.weightage'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import {
  OracleAppointedWeightage,
  OracleAppointedTokenCurrency,
  OraclePriceData,
  OracleState
} from '@whale-api-client/api/oracle'
import BigNumber from 'bignumber.js'

@Injectable()
export class OracleAppointedIndexer extends Indexer {
  constructor (
    private readonly appointedWeightageMapper: OracleAppointedWeightageMapper,
    private readonly appointedTokenCurrencyMapper: OracleAppointedTokenCurrencyMapper,
    private readonly priceDataMapper: OraclePriceDataMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const weightageRecords: Record<string, OracleAppointedWeightage> = {}
    const tokenCurrencyRecords: Record<string, OracleAppointedTokenCurrency> = {}
    const priceDataRecords: Record<string, OraclePriceData> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[0]?.type === 'OP_RETURN' && stack[0]?.code === 106) {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = txn.txid

            // NOTE(jingyi2811): Add weightage
            const weightage: number = stack[1].tx.data.weightage
            weightageRecords[oracleId] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // NOTE(jingyi2811): Add token and currency
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (const priceFeed of priceFeeds) {
              const token: string = priceFeed.token
              const currency: string = priceFeed.currency
              tokenCurrencyRecords[`${oracleId}-${token}-${currency}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(
                block.height,
                oracleId,
                token,
                currency)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            weightageRecords[oracleId] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, 0, OracleState.REMOVED)
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
            // NOTE(jingyi2811): Add price data
            const timestamp: number = stack[1].tx.data.timestamp
            const oracleId: string = stack[1].tx.data.oracleId
            const tokens = stack[1].tx.data.tokens

            for (const token of tokens) {
              const prices = token.prices
              for (const price of prices) {
                const currency: string = price.currency
                const amount: number = price.amount

                priceDataRecords[`${oracleId}-${token as string}-${currency}-${timestamp.toString()}`] = OracleAppointedIndexer.newOraclePriceData(
                  block.height,
                  oracleId,
                  token,
                  currency,
                  new BigNumber(amount),
                  timestamp)
              }
            }
          }
        }
      }
    }

    for (const record of Object.values(weightageRecords)) {
      await this.appointedWeightageMapper.put(record)
    }

    for (const record of Object.values(tokenCurrencyRecords)) {
      await this.appointedTokenCurrencyMapper.put(record)
    }

    for (const record of Object.values(priceDataRecords)) {
      await this.priceDataMapper.put(record)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const appointedWeightageIds: string[] = []
    const appointedTokenCurrencyIds: string[] = []
    const priceDataIds: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[0]?.type === 'OP_RETURN' && stack[0]?.code === 106) {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid

            appointedWeightageIds.push(`${oracleId}-${block.height}`)

            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              appointedTokenCurrencyIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            appointedWeightageIds.push(`${oracleId}-${block.height}`)

            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              appointedTokenCurrencyIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
            }
          } else if (stack[0]?.type === 'OP_RETURN' && stack[0]?.code === 106) {
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

                  priceDataIds.push(`${oracleId}-${token}-${currency}-${block.height}-${timestamp.toString()}`)
                }
              }
            }
          }
        }
      }

      for (const id of appointedWeightageIds) {
        await this.appointedWeightageMapper.delete(id)
      }

      for (const id of appointedTokenCurrencyIds) {
        await this.appointedTokenCurrencyMapper.delete(id)
      }

      for (const id of priceDataIds) {
        await this.priceDataMapper.delete(id)
      }
    }
  }

  static newOracleAppointedWeightage (
    height: number,
    oracleId: string,
    weightage: number,
    state: OracleState
  ): OracleAppointedWeightage {
    return {
      id: `${oracleId}-${height}`,
      block: {
        height
      },
      data: {
        oracleId,
        weightage
      },
      state
    }
  }

  static newOracleAppointedTokenCurrency (
    height: number,
    oracleId: string,
    token: string,
    currency: string
  ): OracleAppointedTokenCurrency {
    return {
      id: `${oracleId}-${token}-${currency}-${height}`,
      block: {
        height
      },
      data: {
        oracleId,
        token,
        currency
      }
    }
  }

  static newOraclePriceData (
    height: number,
    oracleId: string,
    token: string,
    currency: string,
    amount: BigNumber,
    timestamp: number
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
      }
    }
  }
}
