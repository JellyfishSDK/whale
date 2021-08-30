import { CPoolAddLiquidity, CScript, PoolAddLiquidity } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class AddLiquidityIndexer extends TokenActivityIndexer<PoolAddLiquidity> {
  OP_CODE: number = CPoolAddLiquidity.OP_CODE

  async extractTokenActivities (addLiquidity: PoolAddLiquidity): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []

    for (const { script, balances } of addLiquidity.from) {
      const spentFrom = new CScript(script).toHex()
      for (const bal of balances) {
        result.push({
          script: {
            type: 'scripthash',
            hex: spentFrom
          },
          type: 'spend-add-liquidity',
          tokenId: bal.token,
          value: bal.amount.toFixed()
        })
      }
    }

    const receivedAt = new CScript(addLiquidity.shareAddress).toHex()
    result.push({
      script: {
        type: 'scripthash',
        hex: receivedAt
      },
      type: 'add-liquidity-gain',
      tokenId: -1, // FIXME: get via rpc using spent tokens' symbol?
      value: 'null' // FIME: get via rpc (block may yet existed)
    })
    return result
  }
}
