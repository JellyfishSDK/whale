import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolUpdatePair, CPoolUpdatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'

@Injectable()
export class UpdatePoolPairIndexer extends DfTxIndexer<PoolUpdatePair> {
  OP_CODE: number = CPoolUpdatePair.OP_CODE
  private readonly logger = new Logger(UpdatePoolPairIndexer.name)

  constructor (
    private readonly poolPairMapper: PoolPairMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<PoolUpdatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const poolPair = await this.poolPairMapper.getLatest(`${data.poolId}`)
      if (poolPair !== undefined) {
        await this.poolPairMapper.put({
          ...poolPair,
          id: `${data.poolId}-${block.height}`,
          customRewards: data.customRewards.length > 0 ? data.customRewards.map(x => {
            return `${x.amount.toFixed(8)}@${~~x.token}`
          }) : poolPair.customRewards,
          ownerScript: data.ownerAddress.stack.length > 0 ? toBuffer(data.ownerAddress.stack).toString('hex') : poolPair.ownerScript,
          block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
          status: data.status, // Always override status
          commission: data.commission.gte(0) ? data.commission.toFixed(8) : poolPair.commission
        })
      }
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<PoolUpdatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const poolPair = await this.poolPairMapper.getLatest(`${data.poolId}`)
      if (poolPair !== undefined) {
        await this.poolPairMapper.delete(`${data.poolId}-${block.height}`)
      }
    }
  }
}
