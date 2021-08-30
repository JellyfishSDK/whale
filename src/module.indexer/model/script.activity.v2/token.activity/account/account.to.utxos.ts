import { AccountToUtxos, CAccountToUtxos, CScript } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class AccountToUtxosIndexer extends TokenActivityIndexer<AccountToUtxos> {
  OP_CODE: number = CAccountToUtxos.OP_CODE

  async extractTokenActivities (accountToUtxos: AccountToUtxos): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []
    const { from, balances } = accountToUtxos
    const scriptPubKey = new CScript(from).toHex()
    for (const bal of balances) {
      result.push({
        script: {
          type: 'scripthash',
          hex: scriptPubKey
        },
        type: 'spend-account-to-utxos',
        tokenId: bal.token,
        value: bal.amount.toFixed()
      })
    }
    return result
  }
}
