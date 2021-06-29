import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceMapper } from '@src/module.model/oracle.price'
import { OraclePriceAggregration, OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import { OracleWeightageMapper } from '@src/module.model/oracle.weightage'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceAggregrationMapper,
    private readonly weightageMapper: OracleWeightageMapper,
    private readonly priceFeedMapper: OraclePriceFeedMapper,
    private readonly priceMapper: OraclePriceMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceAggregration> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const x = await this.priceMapper.getAll() ?? []

        if (x.length > 1) {
          // console.log(1)
        }

        const priceFeeds = await this.priceFeedMapper.getAll() ?? []

        for (let i = 0; i < priceFeeds.length; i += 1) {
          const priceFeed = priceFeeds[i]
          const id = `${priceFeed.data.token}-${priceFeed.data.currency}`

          const prices = await this.priceMapper.getActivePrice(id, block.time) ?? []

          let sum = 0
          let token = ''
          let currency = ''
          const timestamp = 0

          let hasFound = false

          for (let i = 0; i < prices.length; i += 1) {
            const price = prices[i]
            const mapper = await this.weightageMapper.get(price.data.oracleid)
            const weightage = mapper?.data.weightage ?? 0

            sum = sum + price.data.amount * weightage

            token = price.data.token
            currency = price.data.currency
            hasFound = true
          }

          if (hasFound) {
            records[`${block.height}-${token}-${currency}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block, token, currency, sum / prices.length, timestamp)
            console.log(`${block.height}-${token}-${currency}-${sum / prices.length}`)
          }
        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    return await Promise.resolve(undefined)
  }

  static newOraclePriceAggregation (
    block: RawBlock,
    token: string,
    currency: string,
    amount: number,
    timestamp: number
  ): OraclePriceAggregration {
    return {
      id: `${block.height}-${token}-${currency}`,
      block: {
        height: block.height
      },
      data: {
        amount,
        timestamp
      }
    }
  }
}
