import { CPoolAddLiquidity, CScript, PoolAddLiquidity } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class AddLiquidityIndexer extends TokenActivityIndexer<PoolAddLiquidity> {
  OP_CODE: number = CPoolAddLiquidity.OP_CODE

  async extractTokenActivities (addLiquidity: PoolAddLiquidity): Promise<ScriptTokenActivity[]> {
    console.log('extractTokenActivities', 'add liq')
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
          value: bal.amount.negated().toFixed()
        })
      }
    }

    // TODO: compute add liq result on the fly (required full DEX history indexing)
    return result
  }
}
