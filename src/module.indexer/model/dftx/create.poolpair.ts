import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolCreatePair, CPoolCreatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'

@Injectable()
export class CreatePoolPairIndexer extends DfTxIndexer<PoolCreatePair> {
  OP_CODE: number = CPoolCreatePair.OP_CODE
  private readonly logger = new Logger(CreatePoolPairIndexer.name)

  constructor (
    private readonly poolPairMapper: PoolPairMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<PoolCreatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const id: string = `${data.tokenA}-${data.tokenB}-${block.height}`
      await this.poolPairMapper.put({
        id,
        pairSymbol: data.pairSymbol,
        poolPairId: 0, // TODO: Calculate id
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

      await this.poolPairTokenMapper.put({
        id: `${data.tokenA}-${data.tokenB}`,
        poolpairId: 0, // Calculate id
        block: { hash: block.hash, height: block.height }
      })
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<PoolCreatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      await this.poolPairMapper.delete(`${data.tokenA}-${data.tokenB}-${block.height}`)
    }
  }
}
