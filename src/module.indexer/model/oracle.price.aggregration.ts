import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OracleStatusMapper } from '@src/module.model/oracle.status'
import { OraclePriceDataMapper } from '@src/module.model/oracle.priceData'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.priceFeed'
import { OraclePriceAggregration, OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly statusMapper: OracleStatusMapper,
    private readonly priceFeedMapper: OraclePriceFeedMapper,
    private readonly priceDataMapper: OraclePriceDataMapper,
    private readonly priceAggregrationMapper: OraclePriceAggregrationMapper
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

        const data = await this.priceFeedMapper.getAll() ?? []

        if (data.length > 0) {
          const priceFeedSet: Set<string> = new Set()

          data.filter(p => p.state === 'LIVE').map(m => {
            priceFeedSet.add(`${m.data.token}-${m.data.currency}`)
          })

          for (const priceFeed of priceFeedSet) {
            const data = priceFeed.split('-')
            const token = data[0]
            const currency = data[1]

            const prices = await this.priceDataMapper.getActivePrices(token, currency, block.time) ?? []

            let sum = 0
            const timestamp = 0

            let hasFound = false

            for (let i = 0; i < prices.length; i += 1) {
              const price = prices[i]
              const mapper = await this.statusMapper.get(price.data.oracleId)
              const weightage = mapper?.data.weightage ?? 0

              sum = sum + price.data.amount * weightage
              hasFound = true
            }

            if (hasFound) {
              records[`${block.height}-${token}-${currency}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block, token, currency, sum / prices.length, timestamp)
            }
          }
        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.priceAggregrationMapper.put(aggregation)
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
        timestamp,
        token,
        currency,
        amount
      }
    }
  }
}
