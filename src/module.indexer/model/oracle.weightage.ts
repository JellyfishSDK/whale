import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { OracleWeightage, OracleWeightageMapper } from '@src/module.model/oracle.weightage'
import { OraclePriceFeed, OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'

@Injectable()
export class OracleWeightageIndexer extends Indexer {
  constructor (
    private readonly mapper: OracleWeightageMapper,
    private readonly priceFeedMapper: OraclePriceFeedMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OracleWeightage> = {}
    const priceFeedRecords: Record<string, OraclePriceFeed> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        try {
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          if (stack[1].tx.name === 'OP_DEFI_TX_APPOINT_ORACLE') {
            const oracleId: string = txn.txid
            const weightage = stack[1].tx.data.weightage
            records[oracleId] = OracleWeightageIndexer.newOracleWeightage(block, oracleId, weightage)

            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              priceFeedRecords[`${token}-${currency}`] = OracleWeightageIndexer.newOraclePriceFeed(token, currency)
            }
          }

          if (stack[1].tx.name === 'OP_DEFI_TX_UPDATE_ORACLE') {
            const oracleId: string = stack[1].tx.data.oracleId
            const weightage = stack[1].tx.data.weightage
            records[oracleId] = OracleWeightageIndexer.newOracleWeightage(block, oracleId, weightage)

            const priceFeeds = stack[1].tx.data.priceFeeds

            for (let i = 0; i < priceFeeds.length; i += 1) {
              const priceFeed = priceFeeds[i]

              const token: string = priceFeed.token
              const currency: string = priceFeed.currency

              priceFeedRecords[`${token}-${currency}`] = OracleWeightageIndexer.newOraclePriceFeed(token, currency)
            }
          }
        } catch (e) {
          // console.log(e)
        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }

    for (const aggregation of Object.values(priceFeedRecords)) {
      await this.priceFeedMapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    await this.mapper.delete(block.hash)
  }

  static newOracleWeightage (
    block: RawBlock,
    oracleId: string,
    weightage: number
  ): OracleWeightage {
    return {
      id: oracleId,
      block: {
        height: block.height
      },
      data: {
        weightage
      }
    }
  }

  static newOraclePriceFeed (
    token: string,
    currency: string
  ): OraclePriceFeed {
    return {
      id: `${token}-${currency}`,
      data: {
        token,
        currency
      }
    }
  }
}
