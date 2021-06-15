import { Injectable } from '@nestjs/common'
import { Indexer } from '@src/module.indexer/model/_abstract'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'

@Injectable()
export class PoolPairIndexer extends Indexer {
  constructor (private readonly mapper: PoolPairMapper) {
    super()
  }

  async index (poolpairs: PoolPair[]): Promise<void> {
    for (const p of poolpairs) {
      await this.mapper.put(this.map(p))
    }
  }

  async invalidate (poolpairs: PoolPair[]): Promise<void> {
    for (const p of poolpairs) {
      await this.mapper.delete(p.id)
    }
  }

  map (poolPair: PoolPair): PoolPair {
    return {
      id: poolPair.id,
      symbol: poolPair.symbol,
      name: poolPair.name,
      status: poolPair.status,
      tokenA: {
        id: poolPair.tokenA.id,
        reserve: poolPair.tokenA.reserve,
        blockCommission: poolPair.tokenA.blockCommission
      },
      tokenB: {
        id: poolPair.tokenB.id,
        reserve: poolPair.tokenB.reserve,
        blockCommission: poolPair.tokenB.blockCommission
      },
      commission: poolPair.commission,
      totalLiquidity: poolPair.totalLiquidity,
      tradeEnabled: poolPair.tradeEnabled,
      ownerAddress: poolPair.ownerAddress,
      rewardPct: poolPair.rewardPct,
      customRewards: poolPair.customRewards,
      creation: {
        tx: poolPair.creation.tx,
        height: poolPair.creation.height
      }
    }
  }
}
