import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OraclePriceFeed, OraclePriceFeedMapper, OraclePriceFeedStatus } from '@src/module.model/oracle.priceFeed'

@Injectable()
export class OraclePriceFeedIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceFeedMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const priceFeedRecords: Record<string, OraclePriceFeed> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          // Add priceFeed
          const oracleId: string = txn.txid
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            priceFeedRecords[`${oracleId}-${token}-${currency}`] = OraclePriceFeedIndexer.newOraclePriceFeed(block, oracleId, token, currency, OraclePriceFeedStatus.LIVE)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
          // Removed priceFeed
          const oracleId: string = stack[1].tx.data.oracleId
          const priceFeeds = await this.mapper.getByOracleId(oracleId) ?? []

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const oracleId: string = priceFeed.data.oracleId
            const token: string = priceFeed.data.token
            const currency: string = priceFeed.data.currency

            priceFeedRecords[`${oracleId}-${token}-${currency}`] = OraclePriceFeedIndexer.newOraclePriceFeed(block, oracleId, token, currency, OraclePriceFeedStatus.REMOVED)
          }

          // Add priceFeed
          const addPriceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < addPriceFeeds.length; i += 1) {
            const priceFeed = addPriceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            priceFeedRecords[`${oracleId}-${token}-${currency}`] = OraclePriceFeedIndexer.newOraclePriceFeed(block, oracleId, token, currency, OraclePriceFeedStatus.LIVE)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          // Removed priceFeed
          const oracleId: string = stack[1].tx.data.oracleId
          const priceFeeds = await this.mapper.getByOracleId(oracleId) ?? []

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const oracleId: string = priceFeed.data.oracleId
            const token: string = priceFeed.data.token
            const currency: string = priceFeed.data.currency

            priceFeedRecords[`${oracleId}-${token}-${currency}`] = OraclePriceFeedIndexer.newOraclePriceFeed(block, oracleId, token, currency, OraclePriceFeedStatus.REMOVED)
          }
        }
      }
    }

    for (const aggregation of Object.values(priceFeedRecords)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1].tx.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          // Delete priceFeed
          const oracleId: string = txn.txid
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            await this.mapper.delete(`${oracleId}-${token}-${currency}`)
          }
        }
      }
    }
  }

  static newOraclePriceFeed (
    block: RawBlock,
    oracleId: string,
    token: string,
    currency: string,
    state: OraclePriceFeedStatus
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
