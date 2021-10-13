import { AccountToAccount, CAccountToAccount, CScript } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class AccountToAccountIndexer extends TokenActivityIndexer<AccountToAccount> {
  OP_CODE: number = CAccountToAccount.OP_CODE

  async extractTokenActivities (accountToAccount: AccountToAccount): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []
    const { from, to } = accountToAccount
    const sender = new CScript(from).toHex()

    for (const { script, balances } of to) {
      const recipient = new CScript(script).toHex()
      for (const bal of balances) {
        result.push({
          script: {
            type: 'scripthash',
            hex: sender
          },
          type: 'spend-account-to-account',
          tokenId: bal.token,
          value: bal.amount.negated().toFixed()
        })

        result.push({
          script: {
            type: 'scripthash',
            hex: recipient
          },
          type: 'account-to-account-gain',
          tokenId: bal.token,
          value: bal.amount.toFixed()
        })
      }
    }
    return result
  }
}
