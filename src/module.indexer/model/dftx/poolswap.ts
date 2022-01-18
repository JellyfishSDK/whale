import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolSwap, CPoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '@src/module.indexer/error'

@Injectable()
export class PoolSwapIndexer extends DfTxIndexer<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  constructor (
    private readonly poolPairMapper: PoolPairMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(data.fromTokenId, data.toTokenId)

    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${data.fromTokenId}, ${data.toTokenId} not found`)
    }

    const poolPair = await this.poolPairMapper.getLatest(`${poolPairToken.poolPairId}`)

    if (poolPair !== undefined) {
      // const forward = data.fromTokenId === poolPair.tokenA.id
      // let fromAmount = data.fromAmount

      poolPair.id = `${poolPair.poolPairId}-${block.height}`
      poolPair.block = { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }

      await this.poolPairMapper.put(poolPair)
    }
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolPairToken = await this.poolPairTokenMapper.queryForTokenPair(data.fromTokenId, data.toTokenId)

    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${data.fromTokenId}, ${data.toTokenId} not found`)
    }

    const poolPair = await this.poolPairMapper.getLatest(`${poolPairToken.poolPairId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${poolPairToken.poolPairId} not found`)
    }

    await this.poolPairMapper.delete(`${poolPair.poolPairId}-${block.height}`)
  }
}
