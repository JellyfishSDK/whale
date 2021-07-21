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
  OracleState,
  OraclePriceData
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
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid

            // Add weightage
            const weightage: number = stack[1].tx.data.weightage
            weightageRecords[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Add token and currency
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              tokenCurrencyRecords[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Update weightage
            const oldWeightageObj = await this.appointedWeightageMapper.getLatestByOracleIdHeight(oracleId, block.height)

            if (oldWeightageObj !== undefined && oldWeightageObj !== null) {
              oldWeightageObj.state = OracleState.REMOVED

              const oldHeight: number = oldWeightageObj?.block.height ?? 0
              weightageRecords[`${oracleId}-${oldHeight}`] = oldWeightageObj
            }

            const weightage: number = stack[1].tx.data.weightage
            weightageRecords[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Update token and currency
            const oldTokenCurrencyResult = await this.appointedTokenCurrencyMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < oldTokenCurrencyResult.length; i += 1) {
              const oldTokenCurrencyObj = oldTokenCurrencyResult[i]

              const oldToken: string = oldTokenCurrencyObj.data.token
              const oldCurrency: string = oldTokenCurrencyObj.data.currency
              const oldHeight: number = oldTokenCurrencyObj.block.height

              oldTokenCurrencyObj.state = OracleState.REMOVED
              tokenCurrencyRecords[`${oracleId}-${oldToken}-${oldCurrency}-${oldHeight}`] = oldTokenCurrencyObj
            }

            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency
              tokenCurrencyRecords[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }

            // Update price data
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
              const priceDataResult = await this.priceDataMapper.getByOracleId(oracleId) ?? []

              for (let i = 0; i < priceDataResult.length; i += 1) {
                const priceData = priceDataResult[i]
                const token = priceData.data.token
                const currency = priceData.data.currency

                if (priceData.state === OracleState.LIVE && !tokenCurrencies.includes(`${token}-${currency}`)) {
                  const height = priceData.block.height
                  const timestamp = priceData.data.timestamp

                  priceData.state = OracleState.REMOVED

                  priceDataRecords[`${oracleId}-${token}-${currency}-${height}-${timestamp.toString()}`] = priceData
                }
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Remove weightage
            const weightageObj = await this.appointedWeightageMapper.getLatestByOracleIdHeight(oracleId, block.height)
            const height: number = weightageObj?.block.height ?? 0

            if (weightageObj != null) {
              weightageObj.state = OracleState.REMOVED
              weightageRecords[`${oracleId}-${height}`] = weightageObj
            }

            // Remove token and currency
            const tokenCurrencyResult = await this.appointedTokenCurrencyMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < tokenCurrencyResult.length; i += 1) {
              const tokenCurrencyObj = tokenCurrencyResult[i]

              const token: string = tokenCurrencyObj.data.token
              const currency: string = tokenCurrencyObj.data.currency
              const height: number = tokenCurrencyObj.block.height

              tokenCurrencyObj.state = OracleState.REMOVED
              tokenCurrencyRecords[`${oracleId}-${token}-${currency}-${height}`] = tokenCurrencyObj
            }

            // Remove price data
            const priceDataResult = await this.priceDataMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < priceDataResult.length; i += 1) {
              const priceDataObj = priceDataResult[i]

              if (priceDataObj.state === OracleState.LIVE) {
                const token = priceDataObj.data.token
                const currency = priceDataObj.data.currency
                const height = priceDataObj.block.height
                const timestamp = priceDataObj.data.timestamp

                priceDataObj.state = OracleState.REMOVED

                priceDataRecords[`${oracleId}-${token}-${currency}-${height}-${timestamp.toString()}`] = priceDataObj
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
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

                priceDataRecords[`${oracleId}-${token}-${currency}-${block.height}-${timestamp.toString()}`] = OracleAppointedIndexer.newOraclePriceData(block.height, oracleId, token, currency, new BigNumber(amount), timestamp, OracleState.LIVE)

                const priceDataResult = await this.priceDataMapper.getByOracleIdTokenCurrency(oracleId, token, currency) ?? []

                for (let k = 0; k < priceDataResult.length; k += 1) {
                  const priceDataObj = priceDataResult[k]

                  if (priceDataObj.state === OracleState.LIVE) {
                    const token = priceDataObj.data.token
                    const currency = priceDataObj.data.currency
                    const height = priceDataObj.block.height
                    const timestamp = priceDataObj.data.timestamp

                    priceDataObj.state = OracleState.REMOVED

                    priceDataRecords[`${oracleId}-${token}-${currency}-${height}-${timestamp.toString()}`] = priceDataObj
                  }
                }
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

                for (let y = 0; y < prices.length; y += 1) {
                  const price = prices[y]
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
    currency: string,
    state: OracleState
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
      },
      state
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
