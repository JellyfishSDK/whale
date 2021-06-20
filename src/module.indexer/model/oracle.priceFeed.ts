import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceFeed, OraclePriceFeedMapper } from '@src/module.model/oracle.priceFeed'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ListPricesData } from '@whale-api-client/api/oracles'
import { OraclePrice, OraclePriceMapper } from '@src/module.model/oracle.price'

@Injectable()
export class OraclePriceFeedIndexer extends Indexer {
  constructor (
    private readonly priceFeedMapper: OraclePriceFeedMapper,
    private readonly priceMapper: OraclePriceMapper,
    private readonly client: JsonRpcClient) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      const priceFeeds: ListPricesData[] = await this.client.call('listprices', [], 'bignumber')

      for (const priceFeed of priceFeeds) {
        const result = await this.priceFeedMapper.getByTokenAndCurrency(priceFeed.token, priceFeed.currency)
        if (result === undefined) {
          const oraclePriceFeed: OraclePriceFeed = {
            id: txn.txid,
            token: priceFeed.token,
            currency: priceFeed.currency,
            createdAt: new Date()
          }
          await this.priceFeedMapper.put(oraclePriceFeed)
        }

        if (block.time % 300 === 0) {
          const price: number = await this.client.call('getPrice', [priceFeed.token, priceFeed.currency], 'bignumber')

          const oraclePrice: OraclePrice = {
            id: '0',
            priceFeedId: txn.txid,
            price,
            timestamp: block.time,
            createdAt: new Date()
          }

          await this.priceMapper.put(oraclePrice)
        }
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    await this.priceMapper.delete(block.hash)
    await this.priceFeedMapper.delete(block.hash)
  }
}
