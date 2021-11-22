import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolSwap, CPoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolPairMapper, PoolPair } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { IndexerError } from '@src/module.indexer/error'

export const PoolswapConsensusParams = {
  mainnet: {
    BayFrontGardensHeight: 488300
  },
  testnet: {
    BayFrontGardensHeight: 101342
  },
  regtest: {
    BayFrontGardensHeight: 10
  }
}

const SLOPE_SWAP_RATE = 1000

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
      const BayFrontGardensHeight = PoolswapConsensusParams[this.network].BayFrontGardensHeight
      const swappedPoolpair = PoolSwapIndexer.executeSwap(poolPair, data.fromTokenId, data.fromAmount,
        block.height > BayFrontGardensHeight).poolPair
      swappedPoolpair.id = `${poolPair.poolPairId}-${block.height}`
      swappedPoolpair.block = { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      await this.poolPairMapper.put(swappedPoolpair)
    }
  }

  static executeSwap (poolPair: PoolPair, fromTokenId: number, fromAmount: BigNumber, postBayFrontGardens: boolean):
  { poolPair: PoolPair, result: Record<string, BigNumber>, tokenOut: number } {
    const forward = fromTokenId === poolPair.tokenA.id
    const reserveF = new BigNumber(forward ? poolPair.tokenA.reserve : poolPair.tokenB.reserve)
    const reserveT = new BigNumber(forward ? poolPair.tokenB.reserve : poolPair.tokenA.reserve)

    const commission = new BigNumber(poolPair.commission)
    if (commission.gt(0)) {
      fromAmount = fromAmount.minus(fromAmount.times(commission))
    }

    const result = PoolSwapIndexer.slopeSwap(fromAmount, reserveF, reserveT, postBayFrontGardens)

    poolPair.tokenA.reserve = (forward ? result.poolFrom : result.poolTo).toFixed(8, BigNumber.ROUND_DOWN)
    poolPair.tokenB.reserve = (forward ? result.poolTo : result.poolFrom).toFixed(8, BigNumber.ROUND_DOWN)

    return { poolPair, result, tokenOut: forward ? poolPair.tokenB.id : poolPair.tokenA.id }
  }

  static slopeSwap (unswapped: BigNumber, poolFrom: BigNumber, poolTo: BigNumber, postBayFrontGardens: boolean): Record<string, BigNumber> {
    BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_DOWN })
    BigNumber.set({ DECIMAL_PLACES: 8 })

    let swapped = new BigNumber(0)
    if (!postBayFrontGardens) {
      const chunk = poolFrom.dividedBy(SLOPE_SWAP_RATE).lt(unswapped) ? poolFrom.dividedBy(SLOPE_SWAP_RATE) : unswapped
      while (unswapped.gt(0)) {
        const stepFrom = BigNumber.min(chunk, unswapped)
        const stepTo = poolTo.times(stepFrom).dividedBy(poolFrom)
        poolFrom = poolFrom.plus(stepFrom)
        poolTo = poolTo.minus(stepTo)
        unswapped = unswapped.minus(stepFrom)
        swapped = swapped.plus(stepTo)
      }
    } else {
      swapped = poolTo.minus(poolTo.times(poolFrom).dividedBy(poolFrom.plus(unswapped)))
      poolFrom = poolFrom.plus(unswapped)
      poolTo = poolTo.minus(swapped)
    }

    // Reset to defaults
    BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_HALF_UP })
    BigNumber.set({ DECIMAL_PLACES: 20 })

    return { swapped, poolFrom, poolTo }
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
