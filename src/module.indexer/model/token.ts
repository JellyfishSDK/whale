import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { Token, TokenMapper } from '@src/module.model/token'
import { SmartBuffer } from 'smart-buffer'
import { OP_DEFI_TX, TokenCreate } from '@defichain/jellyfish-transaction/dist/script/defi'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RpcNotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class TokenIndexer extends Indexer {
  constructor (
    private readonly mapper: TokenMapper,
    private readonly client: JsonRpcClient
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547854')) { // 44665478 -> DFTX, 54 -> p -> create token
          const stack: any = toOPCodes(
            SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
          )

          const data: TokenCreate = (stack[1] as OP_DEFI_TX).tx.data

          // get the latest tokenId via rpc listTokens
          const tokens = await this.client.token.listTokens()
          if (Object.keys(tokens).length === 0) {
            throw new RpcNotFoundIndexerError('listTokens')
          }

          const remapTokens = Object.entries(tokens).map(([id, value]) => {
            return {
              id,
              ...value
            }
          })

          const token = remapTokens.find(t => t.symbol === data.symbol)
          if (token === undefined) {
            throw new RpcNotFoundIndexerError('listTokens', data.symbol)
          } else {
            // its fine to index without checking existence
            // as it already passed through the validation during create token in dfid
            const newToken = TokenIndexer.newToken(block, data, token.id)
            await this.mapper.put(newToken)
          }
        }

        // TODO(canonbrother): index UpdateToken
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (vout.scriptPubKey.asm.startsWith('OP_RETURN 4466547854')) { // 44665478 -> DFTX, 54 -> p -> create token
          continue
        }
        const stack: any = toOPCodes(
          SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex'))
        )

        const data = (stack[1] as OP_DEFI_TX).tx.data

        const token = await this.mapper.getLatest()
        if (token !== undefined && token.symbol === data.symbol) {
          await this.mapper.delete(token.id)
        }
      }
    }
  }

  static newToken (block: RawBlock, data: TokenCreate, id: string, symbolId?: string): Token {
    return {
      id: id,
      block: {
        hash: block.hash,
        height: block.height
      },
      symbolId: symbolId,
      symbol: data.symbol,
      name: data.name,
      decimal: data.decimal,
      limit: data.limit.toFixed(),
      mintable: data.mintable,
      tradeable: data.tradeable,
      isDAT: data.isDAT
    }
  }
}
