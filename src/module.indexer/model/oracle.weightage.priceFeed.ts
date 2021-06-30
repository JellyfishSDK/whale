import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleWeightage, OracleWeightageMapper } from '@src/module.model/oracle.weightage'
import { OraclePriceFeed, OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'

@Injectable()
export class OracleWeightagePriceFeedIndexer extends Indexer {
  constructor (
    private readonly oracleWeightageMapper: OracleWeightageMapper,
    private readonly oraclePriceFeedMapper: OraclePriceFeedMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const weightageRecords: Record<string, OracleWeightage> = {}
    const priceFeedRecords: Record<string, OraclePriceFeed> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        try {
          if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid

            // Add weightage
            const weightage = stack[1].tx.data.weightage
            weightageRecords[oracleId] = OracleWeightagePriceFeedIndexer.newOracleWeightage(block, oracleId, weightage, OracleStatus.LIVE)

            // Add priceFeed
            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              priceFeedRecords[`${oracleId}-${token}-${currency}`] = OracleWeightagePriceFeedIndexer.newOraclePriceFeed(block, oracleId, token, currency, OracleStatus.LIVE)
            }
          }

          if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId

            // Add weightage
            const weightage = stack[1].tx.data.weightage
            weightageRecords[oracleId] = OracleWeightagePriceFeedIndexer.newOracleWeightage(block, oracleId, weightage, OracleStatus.LIVE)

            // Removed priceFeed
            const allPriceFeeds = await this.oraclePriceFeedMapper.getAll() ?? []

            for (let y = 0; y < allPriceFeeds.length; y += 1) {
              const removePriceFeeds = await this.oraclePriceFeedMapper.getByOracleId(allPriceFeeds[y].id, oracleId) ?? []

              for (let i = 0; i < removePriceFeeds.length; i += 1) {
                const priceFeed = removePriceFeeds[i]
                priceFeedRecords[`${priceFeed.data.oracleId}-${priceFeed.data.token}-${priceFeed.data.currency}`] = OracleWeightagePriceFeedIndexer.newOraclePriceFeed(block, oracleId, priceFeed.data.token, priceFeed.data.currency, OracleStatus.REMOVED)
              }
            }

            // Add priceFeed
            const addPriceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < addPriceFeeds.length; i += 1) {
              const priceFeed = addPriceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              priceFeedRecords[`${oracleId}-${token}-${currency}`] = OracleWeightagePriceFeedIndexer.newOraclePriceFeed(block, oracleId, token, currency, OracleStatus.LIVE)
            }
          }

          if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            weightageRecords[oracleId] = OracleWeightagePriceFeedIndexer.newOracleWeightage(block, oracleId, 0, OracleStatus.REMOVED)

            // Removed priceFeed
            const allPriceFeeds = await this.oraclePriceFeedMapper.getAll() ?? []

            for (let y = 0; y < allPriceFeeds.length; y += 1) {
              const removePriceFeeds = await this.oraclePriceFeedMapper.getByOracleId(allPriceFeeds[y].id, oracleId) ?? []

              for (let i = 0; i < removePriceFeeds.length; i += 1) {
                const priceFeed = removePriceFeeds[i]
                priceFeedRecords[`${priceFeed.data.oracleId}-${priceFeed.data.token}-${priceFeed.data.currency}`] = OracleWeightagePriceFeedIndexer.newOraclePriceFeed(block, oracleId, priceFeed.data.token, priceFeed.data.currency, OracleStatus.REMOVED)
              }
            }
          }
        } catch (e) {
          console.log(e)
        }
      }
    }

    for (const aggregation of Object.values(weightageRecords)) {
      await this.oracleWeightageMapper.put(aggregation)
    }

    for (const aggregation of Object.values(priceFeedRecords)) {
      await this.oraclePriceFeedMapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1].tx.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          // Delete weightage
          const oracleId: string = txn.txid
          await this.oracleWeightageMapper.delete(oracleId)

          // Delete priceFeed
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            await this.oraclePriceFeedMapper.delete(`${oracleId}-${token}-${currency}`)
          }
        }
      }
    }
  }

  static newOracleWeightage (
    block: RawBlock,
    oracleId: string,
    weightage: number,
    state: OracleStatus
  ): OracleWeightage {
    return {
      id: oracleId,
      block: {
        height: block.height
      },
      data: {
        weightage
      },
      state
    }
  }

  static newOraclePriceFeed (
    block: RawBlock,
    oracleId: string,
    token: string,
    currency: string,
    state: OracleStatus
  ): OraclePriceFeed {
    return {
      id: `${oracleId}-${token}-${currency}`,
      block: {
        height: block.height
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

export enum OracleStatus {
  LIVE = 'LIVE',
  REMOVED = 'REMOVED'
}
