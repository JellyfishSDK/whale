import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OracleAppointedWeightageMapper } from '@src/module.model/oracle.appointed.weightage'
import { OracleState, OracleAppointedWeightage, OracleAppointedTokenCurrency } from '@whale-api-client/api/oracle'

@Injectable()
export class OracleAppointedIndexer extends Indexer {
  constructor (
    private readonly oracleAppointedWeightageMapper: OracleAppointedWeightageMapper,
    private readonly oracleAppointedTokenCurrencyMapper: OracleAppointedTokenCurrencyMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const oracleWeightageRecord: Record<string, OracleAppointedWeightage> = {}
    const oracleTokenCurrencyRecord: Record<string, OracleAppointedTokenCurrency> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[0]?.type === 'OP_RETURN' || stack[0]?.code === '106') {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid

            // Add weightage
            const weightage: number = stack[1].tx.data.weightage

            oracleWeightageRecord[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Add token and currency
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              oracleTokenCurrencyRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Update weightage
            const oldStatus = await this.oracleAppointedWeightageMapper.getLatest(oracleId)
            const oldHeight: number = oldStatus?.block.height ?? 0
            const oldWeightage: number = oldStatus?.data.weightage ?? 0
            oracleWeightageRecord[`${oracleId}-${oldHeight}`] = OracleAppointedIndexer.newOracleAppointedWeightage(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)

            const weightage: number = stack[1].tx.data.weightage
            oracleWeightageRecord[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Update token and currency
            const oldPriceFeeds = await this.oracleAppointedTokenCurrencyMapper.listByOracleId(oracleId) ?? []

            for (let i = 0; i < oldPriceFeeds.length; i += 1) {
              const priceFeed = oldPriceFeeds[i]

              const token: string = priceFeed.data.token
              const currency: string = priceFeed.data.currency
              const height: number = priceFeed.block.height

              oracleTokenCurrencyRecord[`${oracleId}-${token}-${currency}-${height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(height, oracleId, token, currency, OracleState.REMOVED)
            }

            const newPriceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < newPriceFeeds.length; i += 1) {
              const priceFeed = newPriceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency
              oracleTokenCurrencyRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Remove weightage
            const oldStatus = await this.oracleAppointedWeightageMapper.getLatest(oracleId)
            const oldHeight: number = oldStatus?.block.height ?? 0
            const oldWeightage: number = oldStatus?.data.weightage ?? 0

            oracleWeightageRecord[`${oracleId}-${oldHeight}`] = OracleAppointedIndexer.newOracleAppointedWeightage(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)

            // Remove token and currency
            const priceFeeds = await this.oracleAppointedTokenCurrencyMapper.listByOracleId(oracleId) ?? []

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.data.token
              const currency: string = priceFeed.data.currency
              const height: number = priceFeed.block.height

              oracleTokenCurrencyRecord[`${oracleId}-${token}-${currency}-${height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(height, oracleId, token, currency, OracleState.REMOVED)
            }
          }
        }
      }
    }

    for (const appointedRecord of Object.values(oracleWeightageRecord)) {
      await this.oracleAppointedWeightageMapper.put(appointedRecord)
    }

    for (const priceFeedRecord of Object.values(oracleTokenCurrencyRecord)) {
      await this.oracleAppointedTokenCurrencyMapper.put(priceFeedRecord)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const oracleAppointedWeightageIds: string[] = []
    const oracleAppointedTokenCurrencyIds: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          // Remove weightage
          const oracleId: string = txn.txid
          oracleAppointedWeightageIds.push(`${oracleId}-${block.height}`)

          // Remove token currency
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            oracleAppointedTokenCurrencyIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          // Remove weightage
          const oracleId: string = stack[1].tx.data.oracleId
          oracleAppointedWeightageIds.push(`${oracleId}-${block.height}`)

          // Remove token currency
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            oracleAppointedTokenCurrencyIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
          }
        }
      }
    }

    for (const oracleAppointedId of oracleAppointedWeightageIds) {
      await this.oracleAppointedWeightageMapper.delete(oracleAppointedId)
    }

    for (const oraclePriceFeedId of oracleAppointedTokenCurrencyIds) {
      await this.oracleAppointedTokenCurrencyMapper.delete(oraclePriceFeedId)
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
}
