import { UtxosToAccount, CUtxosToAccount, CScript } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class UtxosToAccountIndexer extends TokenActivityIndexer<UtxosToAccount> {
  OP_CODE: number = CUtxosToAccount.OP_CODE

  async extractTokenActivities (utxosToAccount: UtxosToAccount): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []
    const scriptBalances = utxosToAccount.to
    for (const { script, balances } of scriptBalances) {
      const scriptPubKey = new CScript(script).toHex()
      for (const bal of balances) {
        result.push({
          script: {
            type: 'scripthash',
            hex: scriptPubKey
          },
          type: 'utxos-to-account-gain',
          tokenId: bal.token,
          value: bal.amount.toFixed()
        })
      }
    }
    return result
  }
}
