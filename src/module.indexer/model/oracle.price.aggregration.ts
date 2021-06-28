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
    const data = await this.priceMapper.getAllTokenCurrency() ?? []
    const tokenCurrencySet = new Set()

    for (let i = 0; i < data.length; i += 1) {
      const result = data[i]
      tokenCurrencySet.add(`${result.data.token}-${result.data.currency}`)
    }

    const records: Record<string, OraclePriceAggregration> = {}

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }
        for (const tokenCurrency of tokenCurrencySet) {
          let sum = 0
          let token = ''
          let currency = ''
          let timestamp = 0

          let hasFound = false

          for (let i = 0; i < data.length; i += 1) {
            const result = data[i]

            if (
              tokenCurrency === `${result.data.token}-${result.data.currency}` &&
              result.data.timestamp >= block.time - 300 &&
              result.data.timestamp <= block.time + 300
            ) {
              const mapper = await this.weightageMapper.get(result.data.oracleid)
              sum = sum + result.data.amount * ((mapper != null) ? mapper.data.weightage : 0)
              token = result.data.token
              currency = result.data.currency
              timestamp = result.data.timestamp
              hasFound = true
            }
          }

          if (hasFound) {
            records[`${block.height}-${token}-${currency}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block, token, currency, sum / data.length, timestamp)
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

// class OraclePrice {
//   private oracleid: string;
//   private token: string;
//   private currency: string;
//
//   constructor (oracleid: string, token: string, currency: string) {
//     this.oracleid = oracleid;
//     this.token = token;
//     this.currency = currency;
//   }
//
//   getOracleid (): string {
//     return this.oracleid;
//   }
//
//   getToken (): string {
//     return this.token;
//   }
//
//   getCurrency (): string {
//     return this.currency;
//   }
// }
