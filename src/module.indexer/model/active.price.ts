import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'

const DEVIATION_THRESHOLD = 0.3
const BLOCK_INTERVAL = 120

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

      const nextPrice = aggregatedPrice[0].aggregated
      let activePrice
      const previous = await this.activePriceMapper.query(ticker.id, 1)
      if (previous.length > 0 && previous[0].next !== undefined) {
        if (previous[0].next === previous[0].active && previous[0].next.amount === nextPrice.amount) {
          continue
        }

        activePrice = previous[0].next
      }

      await this.activePriceMapper.put({
        id: `${ticker.id}-${block.height}`,
        key: ticker.id,
        valid: activePrice !== undefined && this.isValid(new BigNumber(activePrice.amount), new BigNumber(nextPrice.amount)),
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
        active: activePrice,
        next: nextPrice,
        sort: HexEncoder.encodeHeight(block.mediantime) + HexEncoder.encodeHeight(block.height)
      })
    }
  }

  isValid (active: BigNumber, next: BigNumber): boolean {
    return active.gt(0) &&
            next.gt(0) &&
            next.minus(active).abs().lt(active.times(DEVIATION_THRESHOLD))
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
