import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import { OracleAppointedWeightageMapper } from '@src/module.model/oracle.appointed.weightage'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregration } from '@whale-api-client/api/oracle'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly appointedMapper: OracleAppointedWeightageMapper,
    private readonly priceFeedMapper: OracleAppointedTokenCurrencyMapper,
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

        const data = await this.priceFeedMapper.list() ?? []

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

            let hasFound = false

            let sum = 0
            let weightageSum = 0
            let lastUpdatedTimestamp = 0

            for (let i = 0; i < prices.length; i += 1) {
              const price = prices[i]
              const mapper = await this.appointedMapper.getLatest(price.data.oracleId)
              const weightage = mapper?.data.weightage ?? 0

              sum = sum + price.data.amount * weightage
              weightageSum += weightage

              hasFound = true
              lastUpdatedTimestamp = price.data.timestamp ?? 0
            }

            if (hasFound) {
              records[`${token}-${currency}-${block.height}-${block.time}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block.height, token, currency, sum / weightageSum, block.time, lastUpdatedTimestamp)
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
    height: number,
    token: string,
    currency: string,
    amount: number,
    timestamp: number,
    lastUpdatedTimestamp: number
  ): OraclePriceAggregration {
    return {
      id: `${token}-${currency}-${height}-${timestamp}`,
      block: {
        height
      },
      data: {
        timestamp,
        token,
        currency,
        amount,
        lastUpdatedTimestamp
      }
    }
  }
}
