import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceFeedMapper } from '@src/module.model/oraclePriceFeed'
// import { JsonRpcClient } from "@defichain/jellyfish-api-jsonrpc";

@Injectable()
export class OraclePriceFeedIndexer extends Indexer {
  // private readonly client: JsonRpcClient

  constructor (private readonly mapper: OraclePriceFeedMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    // @ts-expect-error
    await this.mapper.put()
  }

  async invalidate (block: RawBlock): Promise<void> {
    // await this.mapper.delete(block.hash)
  }
}
