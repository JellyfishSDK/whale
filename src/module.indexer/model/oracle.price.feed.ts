import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceFeed, OracleState } from '@whale-api-client/api/oracle'

@Injectable()
export class OraclePriceFeedIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceFeedMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceFeed> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          const oracleId: string = txn.txid
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            records[`${oracleId}-${token}-${currency}-${block.height}`] = OraclePriceFeedIndexer.newOraclePriceFeed(block.height, oracleId, token, currency, OracleState.LIVE)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId

          const oldPriceFeeds = await this.mapper.getByOracleId(oracleId) ?? []

          for (let i = 0; i < oldPriceFeeds.length; i += 1) {
            const priceFeed = oldPriceFeeds[i]

            const token: string = priceFeed.data.token
            const currency: string = priceFeed.data.currency
            const height: number = priceFeed.block.height

            records[`${oracleId}-${token}-${currency}-${height}`] = OraclePriceFeedIndexer.newOraclePriceFeed(height, oracleId, token, currency, OracleState.REMOVED)
          }

          const newPriceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < newPriceFeeds.length; i += 1) {
            const priceFeed = newPriceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency
            records[`${oracleId}-${token}-${currency}-${block.height}`] = OraclePriceFeedIndexer.newOraclePriceFeed(block.height, oracleId, token, currency, OracleState.LIVE)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId

          const priceFeeds = await this.mapper.getByOracleId(oracleId) ?? []

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.data.token
            const currency: string = priceFeed.data.currency
            const height: number = priceFeed.block.height

            records[`${oracleId}-${token}-${currency}-${height}`] = OraclePriceFeedIndexer.newOraclePriceFeed(height, oracleId, token, currency, OracleState.REMOVED)
          }
        }
      }
    }

    for (const priceFeed of Object.values(records)) {
      await this.mapper.put(priceFeed)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const ids: string[] = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        if (stack[1]?.tx?.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
          const oracleId: string = txn.txid
          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            ids.push(`${oracleId}-${token}-${currency}-${block.height}`)
          }
        } else if (stack[1]?.tx?.name === 'OP_DEFI_TX_UPDATE_ORACLE' || stack[1]?.tx?.name === 'OP_DEFI_TX_REMOVE_ORACLE') {
          const oracleId: string = stack[1].tx.data.oracleId

          const priceFeeds = stack[1].tx.data.priceFeeds

          for (let i = 0; i < priceFeeds.length; i += 1) {
            const priceFeed = priceFeeds[i]

            const token: string = priceFeed.token
            const currency: string = priceFeed.currency

            ids.push(`${oracleId}-${token}-${currency}-${block.height}`)
          }
        }
      }

      for (const id of ids) {
        await this.mapper.delete(id)
      }
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
