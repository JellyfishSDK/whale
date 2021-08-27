import { UtxosToAccount, CUtxosToAccount, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from './_abstract'

@Injectable()
export class UtxosToAccountIndexer extends TokenActivityIndexer<UtxosToAccount> {
  OP_CODE: number = CUtxosToAccount.OP_CODE

  async extractTokenActivities (utxosToAccount: UtxosToAccount): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []
    const scriptBalances = utxosToAccount.to
    for (const { script, balances } of scriptBalances) {
      const scriptPubKey = script.stack[1] as OP_PUSHDATA
      for (const bal of balances) {
        result.push({
          script: {
            type: scriptPubKey.type,
            hex: scriptPubKey.hex
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
