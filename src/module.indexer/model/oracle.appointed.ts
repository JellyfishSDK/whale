import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointedWeightageMapper } from '@src/module.model/oracle.appointed.weightage'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OracleAppointedWeightage, OracleAppointedTokenCurrency, OracleState } from '@whale-api-client/api/oracle'

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

        if (stack[0]?.type === 'OP_RETURN' && stack[0]?.code === 106) {
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
            const oldWeightageObj = await this.oracleAppointedWeightageMapper.getLatest(oracleId)
            const oldHeight: number = oldWeightageObj?.block.height ?? 0

            if (oldWeightageObj != null) {
              oracleWeightageRecord[`${oracleId}-${oldHeight}`] = oldWeightageObj
              oracleWeightageRecord[`${oracleId}-${oldHeight}`].state = OracleState.REMOVED
            }

            const weightage: number = stack[1].tx.data.weightage
            oracleWeightageRecord[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Update token and currency
            const oldPriceFeedsObj = await this.oracleAppointedTokenCurrencyMapper.listByOracleId(oracleId) ?? []

            for (let i = 0; i < oldPriceFeedsObj.length; i += 1) {
              const oldPriceFeedObj = oldPriceFeedsObj[i]

              const oldToken: string = oldPriceFeedObj.data.token
              const oldCurrency: string = oldPriceFeedObj.data.currency
              const oldHeight: number = oldPriceFeedObj.block.height

              const oldTokenCurrencyObj = await this.oracleAppointedTokenCurrencyMapper.get(oracleId, oldToken, oldCurrency, oldHeight)

              if (oldTokenCurrencyObj != null) {
                oracleTokenCurrencyRecord[`${oracleId}-${oldToken}-${oldCurrency}-${oldHeight}`] = oldTokenCurrencyObj
                oracleTokenCurrencyRecord[`${oracleId}-${oldToken}-${oldCurrency}-${oldHeight}`].state = OracleState.REMOVED
              }
            }

            const priceFeedsObj = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeedsObj.length; i += 1) {
              const priceFeedObj = priceFeedsObj[i]

              const token: string = priceFeedObj.token
              const currency: string = priceFeedObj.currency
              oracleTokenCurrencyRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Remove weightage
            const oldWeightageObj = await this.oracleAppointedWeightageMapper.getLatest(oracleId)
            const oldHeight: number = oldWeightageObj?.block.height ?? 0

            if (oldWeightageObj != null) {
              oracleWeightageRecord[`${oracleId}-${oldHeight}`] = oldWeightageObj
              oracleWeightageRecord[`${oracleId}-${oldHeight}`].state = OracleState.REMOVED
            }

            // Remove token and currency
            const oldPriceFeedsObj = await this.oracleAppointedTokenCurrencyMapper.listByOracleId(oracleId) ?? []

            for (let i = 0; i < oldPriceFeedsObj.length; i += 1) {
              const oldPriceFeedObj = oldPriceFeedsObj[i]

              const oldToken: string = oldPriceFeedObj.data.token
              const oldCurrency: string = oldPriceFeedObj.data.currency
              const oldHeight: number = oldPriceFeedObj.block.height

              const oldTokenCurrencyObj = await this.oracleAppointedTokenCurrencyMapper.get(oracleId, oldToken, oldCurrency, oldHeight)

              if (oldTokenCurrencyObj != null) {
                oracleTokenCurrencyRecord[`${oracleId}-${oldToken}-${oldCurrency}-${oldHeight}`] = oldTokenCurrencyObj
                oracleTokenCurrencyRecord[`${oracleId}-${oldToken}-${oldCurrency}-${oldHeight}`].state = OracleState.REMOVED
              }
            }
          }
        }
      }
    }

    for (const appointedRecord of Object.values(oracleWeightageRecord)) {
      await this.oracleAppointedWeightageMapper.put(appointedRecord)
    }

    for (const tokenCurrencyRecord of Object.values(oracleTokenCurrencyRecord)) {
      await this.oracleAppointedTokenCurrencyMapper.put(tokenCurrencyRecord)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const oracleAppointedWeightageIds: string[] = []
    const oracleAppointedTokenCurrencyIds: string[] = []

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

            if (weightage > 0) {
              oracleAppointedWeightageIds.push(`${oracleId}-${block.height}`)
            }

            // Add token and currency
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              oracleAppointedTokenCurrencyIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const weightage: number = stack[1].tx.data.weightage

            if (weightage > 0) {
              oracleAppointedWeightageIds.push(`${oracleId}-${block.height}`)
            }

            const priceFeedsObj = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeedsObj.length; i += 1) {
              const priceFeedObj = priceFeedsObj[i]

              const token: string = priceFeedObj.token
              const currency: string = priceFeedObj.currency
              oracleAppointedTokenCurrencyIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
            }
          }
        }
      }
    }

    for (const id of oracleAppointedWeightageIds) {
      await this.oracleAppointedWeightageMapper.delete(id)
    }

    for (const id of oracleAppointedTokenCurrencyIds) {
      await this.oracleAppointedTokenCurrencyMapper.delete(id)
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
