import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceMapper } from '@src/module.model/oracle.price'
import { OraclePriceAggregration, OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import { OracleWeightageMapper } from '@src/module.model/oracle.weightage'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceAggregrationMapper,
    private readonly weightageMapper: OracleWeightageMapper,
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

        const priceSet = new Set()

        try {
          const prices = await this.priceMapper.getActive(block.time)

          if ((prices != null) && prices.length > 0) {
            console.log(prices)
          }

          if (prices != null) {
            for (let i = 0; i < prices.length; i += 1) {
              const price = prices[i]
              priceSet.add(`${price.data.token}-${price.data.currency}`)
            }

            for (let i = 0; i < prices.length; i += 1) {
              const price = prices[i]

              let sum = 0
              const qty = new Map<string, number>()

              for (const s of priceSet) {
                const weightage = await this.weightageMapper.get(price.data.oracleid)
                if (weightage != null) {
                  if (s === `${price.data.token}-${price.data.currency}`) {
                    sum = price.data.amount * weightage.data.weightage

                    let originalNum = qty.get(`${price.data.token}-${price.data.currency}`) ?? 0
                    originalNum++

                    qty.set(`${price.data.token}-${price.data.currency}`, originalNum)
                  }
                }
              }

              let aggregratePrice = 0
              const totalQty = qty.get(`${price.data.token}-${price.data.currency}`) ?? 0

              if (totalQty > 0) {
                aggregratePrice = sum / totalQty
              }

              records[`${block.height}-${price.data.token}-${price.data.currency}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block, price.data.token, price.data.currency, aggregratePrice, price.data.timestamp)
            }
          }
        } catch (e) {
          console.log(e)
        }
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
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
