import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OracleAppointedWeightageMapper } from '@src/module.model/oracle.appointed.weightage'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'
import { OraclePriceAggregration } from '@whale-api-client/api/oracle'
import BigNumber from 'bignumber.js'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly appointedWeightageMapper: OracleAppointedWeightageMapper,
    private readonly appointedTokenCurrencyMapper: OracleAppointedTokenCurrencyMapper,
    private readonly priceDataMapper: OraclePriceDataMapper,
    private readonly priceAggregrationMapper: OraclePriceAggregrationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceAggregration> = {}

    const tokenCurrenciesSet: Set<string> = new Set()
    const tokenCurrencyResult = await this.appointedTokenCurrencyMapper.list() ?? []
    if (tokenCurrencyResult.length > 0) {
      tokenCurrencyResult.forEach(m => {
        tokenCurrenciesSet.add(`${m.data.token}-${m.data.currency}`)
      })
    }

    // NOTE(jingyi2811): Search for distinct token currencies only.
    for (const tokenCurrency of tokenCurrenciesSet) {
      const data = tokenCurrency.split('-')
      const token = data[0]
      const currency = data[1]

      // NOTE(jingyi2811): Search for LIVE price for within 1 hour ago or 1 hour later.
      const priceDataResult = await this.priceDataMapper.getActivePrices(token, currency, block.time) ?? []

      // NOTE(jingyi2811): Calculate average price.
      let sumBN = new BigNumber(0)
      let weightageSum = 0

      for (const priceData of priceDataResult) {
        const weightageObj = await this.appointedWeightageMapper.getLatestByOracleIdHeight(priceData.data.oracleId, block.height)
        const weightage = weightageObj?.data.weightage ?? 0

        const priceDataObj = await this.priceDataMapper.getLatestByOracleIdTokenCurrency(priceData.data.oracleId, token, currency, block.height)
        const amouunt = priceDataObj?.data.amount ?? 0

        sumBN = sumBN.plus(new BigNumber(amouunt).multipliedBy(weightage))
        weightageSum += weightage
      }

      if (priceDataResult.length > 0) {
        records[`${token}-${currency}-${block.height}-${block.time}`] = OraclePriceAggregationIndexer.newOraclePriceAggregation(block.height, block.time, token, currency, sumBN.dividedBy(weightageSum))
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.priceAggregrationMapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const priceAggregrationIds: string[] = []
    const tokenCurrenciesSet: Set<string> = new Set()

    // NOTE(jingyi2811): Should include LIVE and REMOVED token currencies.
    const tokenCurrencyResult = await this.appointedTokenCurrencyMapper.list() ?? []

    if (tokenCurrencyResult.length > 0) {
      tokenCurrencyResult.map(m => {
        tokenCurrenciesSet.add(`${m.data.token}-${m.data.currency}`)
      })
    }

    for (const tokenCurrency of tokenCurrenciesSet) {
      const data = tokenCurrency.split('-')
      const token = data[0]
      const currency = data[1]

      const priceDataResult = (await this.priceDataMapper.getActivePrices(token, currency, block.time) ?? [])

      if (priceDataResult.length > 0) {
        // NOTE(jingyi2811): Should include LIVE and REMOVED price data.
        priceAggregrationIds.push(`${token}-${currency}-${block.height}-${block.time}`)
      }
    }

    for (const id of priceAggregrationIds) {
      await this.priceDataMapper.delete(id)
    }
  }

  static newOraclePriceAggregation (
    height: number,
    blockTime: number,
    token: string,
    currency: string,
    amount: BigNumber
  ): OraclePriceAggregration {
    return {
      id: `${token}-${currency}-${height}-${blockTime}`,
      block: {
        height,
        time: blockTime
      },
      data: {
        token,
        currency,
        amount
      }
    }
  }
}
