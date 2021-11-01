import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceActive, OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'

const DEVIATION_THRESHOLD = 0.3
const BLOCK_INTERVAL = 120
const MINIMUM_LIVE_ORACLES = 2

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
    if (block.height % BLOCK_INTERVAL !== 0) {
      return
    }

    const tickers = await this.priceTickerMapper.query(Number.MAX_SAFE_INTEGER)
    for (const ticker of tickers) {
      const aggregatedPrice = await this.aggregatedMapper.query(ticker.id, 1)
      if (aggregatedPrice.length < 1) {
        continue
      }

      let nextPrice
      if (this.isAggregateValid(aggregatedPrice[0].aggregated)) {
        nextPrice = aggregatedPrice[0].aggregated
      }

      let activePrice
      const previous = await this.activePriceMapper.query(ticker.id, 1)
      if (previous.length > 0) {
        activePrice = previous[0].next !== undefined ? previous[0].next : previous[0].active
      }

      await this.activePriceMapper.put({
        id: `${ticker.id}-${block.height}`,
        key: ticker.id,
        valid: this.isLive(activePrice, nextPrice),
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
        active: activePrice,
        next: nextPrice,
        sort: HexEncoder.encodeHeight(block.mediantime) + HexEncoder.encodeHeight(block.height)
      })
    }
  }

  private isLive (active: OraclePriceActive['active'], next: OraclePriceActive['next']): boolean {
    if (active === undefined || next === undefined) {
      return false
    }

    const activePrice = new BigNumber(active.amount)
    const nextPrice = new BigNumber(next.amount)

    return activePrice.gt(0) &&
            nextPrice.gt(0) &&
            nextPrice.minus(activePrice).abs().lt(activePrice.times(DEVIATION_THRESHOLD))
  }

  private isAggregateValid (aggregate: OraclePriceActive['next']): boolean {
    return aggregate?.oracles !== undefined &&
            aggregate?.oracles.active >= MINIMUM_LIVE_ORACLES &&
            aggregate?.weightage > 0
  }

  async invalidate (block: RawBlock): Promise<void> {
    if (block.height % BLOCK_INTERVAL !== 0) {
      return
    }

    const tickers = await this.priceTickerMapper.query(Number.MAX_SAFE_INTEGER)
    for (const ticker of tickers) {
      await this.activePriceMapper.delete(`${ticker.id}-${block.height}`)
    }
  }
}
