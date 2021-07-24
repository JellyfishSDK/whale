import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import {
  OracleAppointed,
  OraclePriceData,
  OracleState
} from '@whale-api-client/api/oracle'
import BigNumber from 'bignumber.js'

@Injectable()
export class OracleAppointedIndexer extends Indexer {
  constructor (
    private readonly appointedMapper: OracleAppointedMapper,
    private readonly priceDataMapper: OraclePriceDataMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const appointedRecords: Record<string, OracleAppointed> = {}
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
            const oracleId: string = stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE'
              ? txn.txid : stack[1].tx.data.oracleId
            // NOTE(jingyi2811): Add weightage, token and currency
            const weightage: number = stack[1].tx.data.weightage
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (const priceFeed of priceFeeds) {
              const token: string = priceFeed.token
              const currency: string = priceFeed.currency
              appointedRecords[`oracleId-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointed(block.height, oracleId, weightage, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const appointedResult = await this.appointedMapper.getByOracleId(oracleId) ?? []

            for (const result of appointedResult) {
              const token = result.data.token
              const currency = result.data.currency
              const height = result.block.height

              const appointed = await this.appointedMapper.get(oracleId, token, currency, height)

              if (appointed !== undefined) {
                appointedRecords[`${oracleId}-${token}-${currency}-${height}`] = appointed
                appointed.state = OracleState.REMOVED
              }
            }
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

                priceDataRecords[`${oracleId}-${token.token as string}-${currency}-${amount}-${block.height}`] = OracleAppointedIndexer.newOraclePriceData(
                  block.height,
                  oracleId,
                  token.token,
                  currency,
                  new BigNumber(amount),
                  timestamp)
              }
            }
          }
        }
      }
    }

    for (const record of Object.values(appointedRecords)) {
      await this.appointedMapper.put(record)
    }

    for (const record of Object.values(priceDataRecords)) {
      await this.priceDataMapper.put(record)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const appointedRecords: Record<string, OracleAppointed> = {}

    const appointedIds: string[] = []
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
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
              const oracleId: string = stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE'
                ? txn.txid : stack[1].tx.data.oracleId
              const priceFeeds = stack[1].tx.data.priceFeeds

              for (const priceFeed of priceFeeds) {
                const token: string = priceFeed.token
                const currency: string = priceFeed.currency
                appointedIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const appointedResult = await this.appointedMapper.getByOracleId(oracleId) ?? []

            for (const result of appointedResult) {
              const token = result.data.token
              const currency = result.data.currency
              const height = result.block.height

              const appointed = await this.appointedMapper.get(oracleId, token, currency, height)

              if (appointed !== undefined) {
                appointedRecords[`${oracleId}-${token}-${currency}-${height}`] = appointed
                appointed.state = OracleState.LIVE
              }
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_SET_ORACLE_DATA') {
            const oracleId: string = stack[1].tx.data.oracleId
            const tokens = stack[1].tx.data.tokens

            for (const token of tokens) {
              const prices = token.prices
              for (const price of prices) {
                const currency: string = price.currency
                const amount: number = price.amount
                priceDataIds.push(`${oracleId}-${token.token as string}-${currency}-${amount}-${block.height}`)
              }
            }
          }
        }
      }

      for (const id of appointedIds) {
        await this.appointedMapper.delete(id)
      }

      for (const id of priceDataIds) {
        await this.priceDataMapper.delete(id)
      }

      for (const record of Object.values(appointedRecords)) {
        await this.appointedMapper.put(record)
      }
    }
  }

  static newOracleAppointed (
    height: number,
    oracleId: string,
    weightage: number,
    token: string,
    currency: string,
    state: OracleState
  ): OracleAppointed {
    return {
      id: `${oracleId}-${token}-${currency}-${height.toString()}`,
      block: {
        height
      },
      data: {
        oracleId,
        weightage,
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
    timestamp: number
  ): OraclePriceData {
    return {
      id: `${oracleId}-${token}-${currency}-${amount.toString()}-${height.toString()}`,
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
