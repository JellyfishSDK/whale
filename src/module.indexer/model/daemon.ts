import { Injectable } from '@nestjs/common'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemePendingMapper } from '@src/module.model/loan.scheme.pending'
import BigNumber from 'bignumber.js'
import { blockchain as defid } from '@defichain/jellyfish-api-core'

@Injectable()
export class Daemon {
  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemePendingMapper: LoanSchemePendingMapper
  ) {
  }

  async process (block: defid.Block<defid.Transaction>): Promise<void> {
    const list = await this.loanSchemePendingMapper.query(100)
    for (const pendingLoanScheme of list) {
      if (new BigNumber(block.height).gte(pendingLoanScheme.activateAfterBlock)) {
        await this.loanSchemeMapper.put(pendingLoanScheme)
        await this.loanSchemePendingMapper.delete(pendingLoanScheme.id)
      }
    }
  }
}
