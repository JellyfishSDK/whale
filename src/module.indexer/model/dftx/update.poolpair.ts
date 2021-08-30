import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolUpdatePair, CPoolUpdatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'

@Injectable()
export class CreatePoolPairIndexer extends DfTxIndexer<PoolUpdatePair> {
  OP_CODE: number = CPoolUpdatePair.OP_CODE
  private readonly logger = new Logger(CreatePoolPairIndexer.name)

  constructor (
    private readonly poolPairMapper: PoolPairMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<PoolUpdatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const poolPair = await this.poolPairMapper.getLatest(data.poolId)
      if (poolPair !== undefined) {
        await this.poolPairMapper.put({
          id: poolPair.id,
          poolPairId: poolPair.poolPairId,
          pairSymbol: poolPair.pairSymbol,
          tokenA: {
            id: poolPair.tokenA.id
          },
          tokenB: {
            id: poolPair.tokenB.id
          },
          block: { hash: block.hash, height: block.height },
          status: poolPair.status,
          commission: poolPair.commission
        })
      }
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<PoolUpdatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const poolPair = await this.poolPairMapper.getLatest(data.poolId)
      if (poolPair !== undefined) {
        await this.poolPairMapper.delete(`${poolPair.tokenA.id}-${poolPair.tokenB.id}-${block.height}`)
      }
    }
  }
}
