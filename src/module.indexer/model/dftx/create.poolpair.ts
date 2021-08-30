import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolCreatePair, CPoolCreatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'

@Injectable()
export class CreatePoolPairIndexer extends DfTxIndexer<PoolCreatePair> {
  OP_CODE: number = CPoolCreatePair.OP_CODE
  private readonly logger = new Logger(CreatePoolPairIndexer.name)

  constructor (
    private readonly poolPairMapper: PoolPairMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<PoolCreatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const id: string = `${data.tokenA}-${data.tokenB}-${block.height}`
      await this.poolPairMapper.put({
        id,
        key: `${data.tokenA}-${data.tokenB}`,
        pairSymbol: data.pairSymbol,
        tokenA: {
          id: data.tokenA
        },
        tokenB: {
          id: data.tokenB
        },
        block: { hash: block.hash, height: block.height },
        status: data.status,
        commission: data.commission.toFixed(8)
      })
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<PoolCreatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      await this.poolPairMapper.delete(`${data.tokenA}-${data.tokenB}-${block.height}`)
    }
  }
}
