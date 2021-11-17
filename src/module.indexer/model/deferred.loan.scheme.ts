import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
import BigNumber from 'bignumber.js'

@Injectable()
export class DeferredLoanSchemeIndexer extends Indexer {
  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly deferredLoanSchemeMapper: DeferredLoanSchemeMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const list = await this.deferredLoanSchemeMapper.query(100)
    for (const each of list) {
      if (new BigNumber(block.height).gte(each.activateAfterBlock)) {
        await this.loanSchemeMapper.put(each)
        await this.deferredLoanSchemeMapper.delete(each.id)
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
  }
}
