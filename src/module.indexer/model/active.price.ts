import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class ActivePriceIndexer extends Indexer {
  constructor (
    private readonly aggregatedMapper: OraclePriceAggregatedMapper,
    private readonly activePriceMapper: OraclePriceActiveMapper,
    private readonly priceTickerMapper: PriceTickerMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    if (block.height % 120 === 0) {
      // !TODO: Ok to query like this?
      const tickers = await this.priceTickerMapper.query(1000)
      for (const ticker of tickers) {
        const aggregatedPrice = await this.aggregatedMapper.query(ticker.id, 1)
        if (aggregatedPrice.length < 1) {
          continue
        }

        const aggregatedAmount = aggregatedPrice[0].aggregated.amount
        const previous = await this.activePriceMapper.query(ticker.id, 1)

        let activePrice = '0.00000000'
        if (previous.length > 0) {
          if (previous[0].next === previous[0].active) {
            continue
          }

          activePrice = previous[0].next
        }

        await this.activePriceMapper.put({
          id: `${ticker.id}-${block.height}`,
          key: ticker.id,
          block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
          active: activePrice,
          next: aggregatedAmount,
          sort: HexEncoder.encodeHeight(block.mediantime) + HexEncoder.encodeHeight(block.height)
        })
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const tickers = await this.priceTickerMapper.query(1000)
    for (const ticker of tickers) {
      await this.activePriceMapper.delete(`${ticker.id}-${block.height}`)
    }
  }
}
