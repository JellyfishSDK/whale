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
    private readonly appointedWeightageMapper: OracleAppointedWeightageMapper,
    private readonly appointedTokenCurrencyMapper: OracleAppointedTokenCurrencyMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const weightageRecord: Record<string, OracleAppointedWeightage> = {}
    const tokenCurrencyRecord: Record<string, OracleAppointedTokenCurrency> = {}

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
            weightageRecord[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Add token and currency
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              tokenCurrencyRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Update weightage
            const oldWeightageObj = await this.appointedWeightageMapper.getLatestByOracleIdHeight(oracleId, block.height)
            const oldHeight: number = oldWeightageObj?.block.height ?? 0

            if (oldWeightageObj != null) {
              oldWeightageObj.state = OracleState.REMOVED
              weightageRecord[`${oracleId}-${oldHeight}`] = oldWeightageObj
            }

            const weightage: number = stack[1].tx.data.weightage
            weightageRecord[`${oracleId}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedWeightage(block.height, oracleId, weightage, OracleState.LIVE)

            // Update token and currency
            const oldTokenCurrencyResult = await this.appointedTokenCurrencyMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < oldTokenCurrencyResult.length; i += 1) {
              const oldTokenCurrencyObj = oldTokenCurrencyResult[i]

              const oldToken: string = oldTokenCurrencyObj.data.token
              const oldCurrency: string = oldTokenCurrencyObj.data.currency
              const oldHeight: number = oldTokenCurrencyObj.block.height

              oldTokenCurrencyObj.state = OracleState.REMOVED
              tokenCurrencyRecord[`${oracleId}-${oldToken}-${oldCurrency}-${oldHeight}`] = oldTokenCurrencyObj
            }

            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency
              tokenCurrencyRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedIndexer.newOracleAppointedTokenCurrency(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Remove weightage
            const weightageObj = await this.appointedWeightageMapper.getLatestByOracleIdHeight(oracleId, block.height)
            const height: number = weightageObj?.block.height ?? 0

            if (weightageObj != null) {
              weightageObj.state = OracleState.REMOVED
              weightageRecord[`${oracleId}-${height}`] = weightageObj
            }

            // Remove token and currency
            const tokenCurrencyResult = await this.appointedTokenCurrencyMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < tokenCurrencyResult.length; i += 1) {
              const tokenCurrencyObj = tokenCurrencyResult[i]

              const token: string = tokenCurrencyObj.data.token
              const currency: string = tokenCurrencyObj.data.currency
              const height: number = tokenCurrencyObj.block.height

              tokenCurrencyObj.state = OracleState.REMOVED
              tokenCurrencyRecord[`${oracleId}-${token}-${currency}-${height}`] = tokenCurrencyObj
            }
          }
        }
      }
    }

    for (const record of Object.values(weightageRecord)) {
      await this.appointedWeightageMapper.put(record)
    }

    for (const record of Object.values(tokenCurrencyRecord)) {
      await this.appointedTokenCurrencyMapper.put(record)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const appointedWeightageIds: string[] = []
    const appointedTokenCurrencyIds: string[] = []

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
