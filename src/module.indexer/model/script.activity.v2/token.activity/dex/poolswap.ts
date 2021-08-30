import { CPoolSwap, CScript, PoolSwap } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class PoolSwapIndexer extends TokenActivityIndexer<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  async extractTokenActivities (poolswap: PoolSwap): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []

    const spendFrom = new CScript(poolswap.fromScript).toHex()
    result.push({
      script: {
        type: 'scripthash',
        hex: spendFrom
      },
      type: 'spend-poolswap',
      tokenId: poolswap.fromTokenId,
      value: poolswap.fromAmount.toFixed() // FIME: get via rpc (block may yet existed)
    })

    const receivedAt = new CScript(poolswap.toScript).toHex()
    result.push({
      script: {
        type: 'scripthash',
        hex: receivedAt
      },
      type: 'poolswap-gain',
      tokenId: poolswap.toTokenId,
      value: 'null' // FIME: get via rpc (block may yet existed) or estimate using maxprice
    })

    return result
  }
}
