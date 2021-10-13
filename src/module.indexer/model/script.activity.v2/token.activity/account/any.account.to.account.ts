import { AnyAccountToAccount, CAnyAccountToAccount, CScript } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { ScriptTokenActivity, TokenActivityIndexer } from '../_abstract'

@Injectable()
export class AnyAccountToAccountIndexer extends TokenActivityIndexer<AnyAccountToAccount> {
  OP_CODE: number = CAnyAccountToAccount.OP_CODE

  async extractTokenActivities (anyAccountToAccount: AnyAccountToAccount): Promise<ScriptTokenActivity[]> {
    const result: ScriptTokenActivity[] = []

    for (const { script, balances } of anyAccountToAccount.from) {
      const sender = new CScript(script).toHex()
      for (const bal of balances) {
        result.push({
          script: {
            type: 'scripthash',
            hex: sender
          },
          type: 'spend-any-account-to-account',
          tokenId: bal.token,
          value: bal.amount.negated().toFixed()
        })
      }
    }

    for (const { script, balances } of anyAccountToAccount.to) {
      const to = new CScript(script).toHex()
      for (const bal of balances) {
        result.push({
          script: {
            type: 'scripthash',
            hex: to
          },
          type: 'any-account-to-account-gain',
          tokenId: bal.token,
          value: bal.amount.toFixed()
        })
      }
    }

    return result
  }
}
