import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemePendingMapper } from '@src/module.model/loan.scheme.pending'
import BigNumber from 'bignumber.js'

@Injectable()
export class LoanSchemePendingIndexer extends Indexer {
  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeInactiveMapper: LoanSchemePendingMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const list = await this.loanSchemeInactiveMapper.query(100)
    for (const inactiveLoanScheme of list) {
      if (new BigNumber(block.height).gte(inactiveLoanScheme.activateAfterBlock)) {
        await this.loanSchemeMapper.put(inactiveLoanScheme)
        await this.loanSchemeInactiveMapper.delete(inactiveLoanScheme.id)
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
  }
}
