import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'
import { OracleState, OracleAppointed, OraclePriceFeed } from '@whale-api-client/api/oracle'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'

@Injectable()
export class OracleAppointedPriceFeedIndexer extends Indexer {
  constructor (
    private readonly oracleAppointedMapper: OracleAppointedMapper,
    private readonly oraclePriceFeedMapper: OraclePriceFeedMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const oracleAppointedRecord: Record<string, OracleAppointed> = {}
    const oraclePriceFeedRecord: Record<string, OraclePriceFeed> = {}

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

            oracleAppointedRecord[`${oracleId}-${block.height}`] = OracleAppointedPriceFeedIndexer.newOracleAppointed(block.height, oracleId, weightage, OracleState.LIVE)

            // Add priceFeeds
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              oraclePriceFeedRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedPriceFeedIndexer.newOraclePriceFeed(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Update weightage
            const oldStatus = await this.oracleAppointedMapper.getLatest(oracleId)
            const oldHeight: number = oldStatus?.block.height ?? 0
            const oldWeightage: number = oldStatus?.data.weightage ?? 0
            oracleAppointedRecord[`${oracleId}-${oldHeight}`] = OracleAppointedPriceFeedIndexer.newOracleAppointed(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)

            const weightage: number = stack[1].tx.data.weightage
            oracleAppointedRecord[`${oracleId}-${block.height}`] = OracleAppointedPriceFeedIndexer.newOracleAppointed(block.height, oracleId, weightage, OracleState.LIVE)

            // Update priceFeeds
            const oldPriceFeeds = await this.oraclePriceFeedMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < oldPriceFeeds.length; i += 1) {
              const priceFeed = oldPriceFeeds[i]

              const token: string = priceFeed.data.token
              const currency: string = priceFeed.data.currency
              const height: number = priceFeed.block.height

              oraclePriceFeedRecord[`${oracleId}-${token}-${currency}-${height}`] = OracleAppointedPriceFeedIndexer.newOraclePriceFeed(height, oracleId, token, currency, OracleState.REMOVED)
            }

            const newPriceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < newPriceFeeds.length; i += 1) {
              const priceFeed = newPriceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency
              oraclePriceFeedRecord[`${oracleId}-${token}-${currency}-${block.height}`] = OracleAppointedPriceFeedIndexer.newOraclePriceFeed(block.height, oracleId, token, currency, OracleState.LIVE)
            }
          } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Remove weightage
            const oldStatus = await this.oracleAppointedMapper.getLatest(oracleId)
            const oldHeight: number = oldStatus?.block.height ?? 0
            const oldWeightage: number = oldStatus?.data.weightage ?? 0

            oracleAppointedRecord[`${oracleId}-${oldHeight}`] = OracleAppointedPriceFeedIndexer.newOracleAppointed(oldHeight, oracleId, oldWeightage, OracleState.REMOVED)

            // Remove priceFeeds
            const priceFeeds = await this.oraclePriceFeedMapper.getByOracleId(oracleId) ?? []

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.data.token
              const currency: string = priceFeed.data.currency
              const height: number = priceFeed.block.height

              oraclePriceFeedRecord[`${oracleId}-${token}-${currency}-${height}`] = OracleAppointedPriceFeedIndexer.newOraclePriceFeed(height, oracleId, token, currency, OracleState.REMOVED)
            }
          }
        }
      }
    }

    for (const appointedRecord of Object.values(oracleAppointedRecord)) {
      await this.oracleAppointedMapper.put(appointedRecord)
    }

    for (const priceFeedRecord of Object.values(oraclePriceFeedRecord)) {
      await this.oraclePriceFeedMapper.put(priceFeedRecord)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const oracleAppointedIds: string[] = []
    const oraclePriceFeedIds: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          // Remove weightage
          const oracleId: string = txn.txid
          oracleAppointedIds.push(`${oracleId}-${block.height}`)

          // Remove priceFeeds
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            oraclePriceFeedIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          // Remove weightage
          const oracleId: string = stack[1].tx.data.oracleId
          oracleAppointedIds.push(`${oracleId}-${block.height}`)

          // Remove priceFeeds
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            oraclePriceFeedIds.push(`${oracleId}-${token}-${currency}-${block.height}`)
          }
        }
      }
    }

    for (const oracleAppointedId of oracleAppointedIds) {
      await this.oracleAppointedMapper.delete(oracleAppointedId)
    }

    for (const oraclePriceFeedId of oraclePriceFeedIds) {
      await this.oraclePriceFeedMapper.delete(oraclePriceFeedId)
    }
  }

  static newOracleAppointed (
    height: number,
    oracleId: string,
    weightage: number,
    state: OracleState
  ): OracleAppointed {
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

  static newOraclePriceFeed (
    height: number,
    oracleId: string,
    token: string,
    currency: string,
    state: OracleState
  ): OraclePriceFeed {
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
