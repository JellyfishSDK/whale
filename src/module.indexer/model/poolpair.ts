import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError, RpcItemLengthError, RpcNotFoundIndexerError } from '@src/module.indexer/error'
import { PoolPair, PoolPairMapper } from '@src/module.model/poolpair'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX, PoolCreatePair, PoolUpdatePair } from '@defichain/jellyfish-transaction'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Injectable()
export class PoolPairIndexer extends Indexer {
  constructor (
    private readonly mapper: PoolPairMapper,
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

          const symbol = data.pairSymbol !== ''
            ? data.pairSymbol
            : await this.constructPairSymbol(data.tokenA.toString(), data.tokenB.toString())

          const rpcPoolPair = await this.client.poolpair.getPoolPair(symbol)

          if (Object.keys(rpcPoolPair).length !== 1) throw new RpcItemLengthError('poolpair')

          const poolId = Object.keys(rpcPoolPair)[0]

          const poolpair = PoolPairIndexer.newPoolPair(block, {
            ...data,
            tokenA: data.tokenA.toString(),
            tokenB: data.tokenB.toString(),
            poolId,
            symbol
          })

          await this.mapper.put(poolpair)
        }

        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547875')) { // 44665478 -> DFTX, 75 -> u -> update poolpair
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: PoolUpdatePair = (stack[1] as OP_DEFI_TX).tx.data

          const rpcPoolPair = await this.client.poolpair.getPoolPair(data.poolId.toString())

          if (Object.keys(rpcPoolPair).length !== 1) throw new RpcItemLengthError('poolpair')

          const poolId = Object.keys(rpcPoolPair)[0]
          const symbol = rpcPoolPair[poolId].symbol

          const poolpair = PoolPairIndexer.newPoolPair(block, {
            ...data,
            tokenA: rpcPoolPair[poolId].idTokenA,
            tokenB: rpcPoolPair[poolId].idTokenB,
            poolId,
            symbol
          })

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

          const poolpair = await this.mapper.getLatest(`${data.tokenA}-${data.tokenB}`)
          if (poolpair === undefined) {
            throw new NotFoundIndexerError('invalidate', 'CreatePoolPair', `${data.tokenA}-${data.tokenB}`)
          }

          await this.mapper.delete(poolpair.id)
        }

        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547875')) { // 44665478 -> DFTX, 75 -> u -> update poolpair
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: PoolUpdatePair = (stack[1] as OP_DEFI_TX).tx.data

          const rpcPoolPair = await this.client.poolpair.getPoolPair(data.poolId.toString())

          // extra guard
          if (Object.keys(rpcPoolPair).length !== 1) throw new RpcItemLengthError('poolpair')

          const poolId = Object.keys(rpcPoolPair)[0]
          const tokenA = rpcPoolPair[poolId].idTokenA
          const tokenB = rpcPoolPair[poolId].idTokenB

          const poolpair = await this.mapper.getLatest(`${tokenA}-${tokenB}`)

          if (poolpair === undefined) {
            throw new NotFoundIndexerError('invalidate', 'UpdatePoolPair', `${tokenA}-${tokenB}`)
          }

          await this.mapper.delete(poolpair.id)
        }
      }
    }
  }

  private async constructPairSymbol (tokenAId: string, tokenBId: string): Promise<string> {
    const tokenA = await this.client.token.getToken(tokenAId)
    if (tokenA === undefined) {
      throw new RpcNotFoundIndexerError('getToken', tokenAId)
    }

    const tokenB = await this.client.token.getToken(tokenBId)
    if (tokenB === undefined) {
      throw new RpcNotFoundIndexerError('getToken', tokenBId)
    }

    return `${tokenA[tokenAId].symbol}-${tokenB[tokenBId].symbol}`
  }

  static newPoolPair (block: RawBlock, data: NewPoolPairPayload): PoolPair {
    return {
      id: `${data.tokenA}-${data.tokenB}-${block.height}`,
      symbolId: `${data.tokenA}-${data.tokenB}`,
      poolId: data.poolId,
      block: {
        hash: block.hash,
        height: block.height
      },
      symbol: data.symbol,
      status: data.status,
      commission: data.commission.toFixed()
    }
  }
}

interface NewPoolPairPayload {
  tokenA: string
  tokenB: string
  poolId: string
  symbol: string
  status: boolean
  commission: BigNumber
}
