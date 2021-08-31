import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolCreatePair, CPoolCreatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { TokenMapper } from '@src/module.model/token'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class CreatePoolPairIndexer extends DfTxIndexer<PoolCreatePair> {
  OP_CODE: number = CPoolCreatePair.OP_CODE
  private readonly logger = new Logger(CreatePoolPairIndexer.name)

  constructor (
    private readonly poolPairMapper: PoolPairMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly tokenMapper: TokenMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<PoolCreatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenId = await this.tokenMapper.getNextTokenID(true)

      // TODO: Index customRewards, ownerAddress
      await this.poolPairMapper.put({
        id: `${tokenId}-${block.height}`,
        pairSymbol: data.pairSymbol,
        poolPairId: `${tokenId}`,
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
        id: `${data.tokenA}-${data.tokenB}-${tokenId}`,
        key: `${data.tokenA}-${data.tokenB}`,
        poolpairId: tokenId,
        block: { hash: block.hash, height: block.height }
      })

      await this.tokenMapper.put({
        id: `${tokenId}`,
        sort: HexEncoder.encodeHeight(tokenId),
        symbol: data.pairSymbol,
        name: `${data.tokenA}-${data.tokenB} LP Token`,
        isDAT: true,
        isLPS: true,
        limit: '0.0',
        mintable: false,
        decimal: 8,
        tradeable: true,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<PoolCreatePair>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenId = await this.tokenMapper.getNextTokenID(true)
      await this.poolPairMapper.delete(`${tokenId - 1}-${block.height}`)
      await this.poolPairTokenMapper.delete(`${data.tokenA}-${data.tokenB}`)
      await this.tokenMapper.delete(`${tokenId - 1}`)
    }
  }
}
