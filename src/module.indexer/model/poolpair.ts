import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX, PoolCreatePair, PoolUpdatePair } from '@defichain/jellyfish-transaction/dist/script/defi'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { TokenMapper } from '@src/module.model/token'
import { TokenIndexer } from './token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Injectable()
export class PoolPairIndexer extends Indexer {
  constructor (
    private readonly mapper: PoolPairMapper,
    private readonly tokenMapper: TokenMapper,
    private readonly client: JsonRpcClient
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547870')) { // 44665478 -> DFTX, 70 -> p -> create poolpair
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: PoolCreatePair = (stack[1] as OP_DEFI_TX).tx.data

          const pairSymbol = data.pairSymbol !== ''
            ? data.pairSymbol
            : await this.constructPairSymbol(data.tokenA.toString(), data.tokenB.toString())

          const rpcPoolPair = await this.client.poolpair.getPoolPair(pairSymbol)
          const poolId = Object.keys(rpcPoolPair)[0]

          const poolpair = await PoolPairIndexer.newPoolPair(block, data, poolId, pairSymbol)

          const newToken = TokenIndexer.newToken(block, {
            symbol: pairSymbol,
            name: pairSymbol,
            decimal: 8,
            limit: new BigNumber('0'),
            mintable: false,
            tradeable: true,
            isDAT: true
          }, poolId, `${data.tokenA}-${data.tokenB}`)
          await this.tokenMapper.put(newToken)

          await this.mapper.put(poolpair)
        }

        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547875')) { // 44665478 -> DFTX, 75 -> u -> update poolpair
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: PoolUpdatePair = (stack[1] as OP_DEFI_TX).tx.data

          // find poolpair by token with data.poolId
          const token = await this.tokenMapper.get(data.poolId.toString())
          if (token === undefined || token.symbolId === undefined) {
            throw new NotFoundIndexerError('index', 'UpdatePoolPair->Token', `${data.poolId}`)
          }

          const poolpair = await this.mapper.get(token.symbolId)
          if (poolpair === undefined) {
            throw new NotFoundIndexerError('index', 'UpdatePoolPair', `${data.poolId}`)
          }
          // TODO(canonbrother): update ownerAddress, customRewards
          poolpair.status = data.status
          poolpair.commission = data.commission.toFixed()

          await this.mapper.put(poolpair)
        }
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547870')) { // 44665478 -> DFTX, 70 -> p -> create poolpair
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: PoolCreatePair = (stack[1] as OP_DEFI_TX).tx.data

          await this.mapper.delete(`${data.tokenA}-${data.tokenB}`)
        }

        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547875')) { // 44665478 -> DFTX, 75 -> u -> update poolpair
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: PoolUpdatePair = (stack[1] as OP_DEFI_TX).tx.data

          // find poolpair by token with data.poolId
          const token = await this.tokenMapper.get(data.poolId.toString())
          if (token === undefined || token.symbolId === undefined) {
            throw new NotFoundIndexerError('index', 'UpdatePoolPair->Token', `${data.poolId}`)
          }

          const poolpair = await this.mapper.get(token.symbolId)
          if (poolpair === undefined) {
            throw new NotFoundIndexerError('index', 'UpdatePoolPair', `${data.poolId}`)
          }

          await this.mapper.delete(poolpair.id)
        }
      }
    }
  }

  private async constructPairSymbol (tokenAId: string, tokenBId: string): Promise<string> {
    const tokenA = await this.tokenMapper.get(tokenAId)
    if (tokenA === undefined) {
      throw new NotFoundIndexerError('index', 'CreatePoolPair-Token', tokenAId)
    }

    const tokenB = await this.tokenMapper.get(tokenBId)
    if (tokenB === undefined) {
      throw new NotFoundIndexerError('index', 'CreatePoolPair-Token', tokenBId)
    }

    return `${tokenA.symbol}-${tokenB.symbol}`
  }

  static newPoolPair (
    block: RawBlock, data: PoolCreatePair, id: string, pairSymbol: string
  ): PoolPair {
    return {
      // Note(canonbrother): the id design intentionally made, easier for poolswap block get poolpair
      id: `${data.tokenA}-${data.tokenB}`,
      poolId: id,
      block: {
        hash: block.hash,
        height: block.height
      },
      symbol: pairSymbol,
      status: data.status,
      commission: data.commission.toFixed(),
      tokenA: data.tokenA.toString(),
      tokenB: data.tokenB.toString()
    }
  }
}
