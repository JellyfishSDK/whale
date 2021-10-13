import { CPoolRemoveLiquidity, CScript, PoolRemoveLiquidity } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class RemoveLiquidityIndexer extends TokenActivityIndexer<PoolRemoveLiquidity> {
  OP_CODE: number = CPoolRemoveLiquidity.OP_CODE

  async extractTokenActivities (removeLiquidity: PoolRemoveLiquidity): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []
    const { script, tokenId, amount } = removeLiquidity
    const removedFrom = new CScript(script).toHex()
    result.push({
      script: {
        type: 'scripthash',
        hex: removedFrom
      },
      type: 'spend-remove-liquidity',
      tokenId,
      value: amount.negated().toFixed()
    })

    // TODO: compute remove liq result on the fly (required full DEX history indexing)
    return result

    // gained token from removed liquidity is not indexed
  }
}
