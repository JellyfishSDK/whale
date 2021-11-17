import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DeferredModelMapper } from '@src/module.model/deferred.model'
import BigNumber from 'bignumber.js'

@Injectable()
export class DeferredModelIndexer extends Indexer {
  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly deferredModelMapper: DeferredModelMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const list = await this.deferredModelMapper.query(100)
    for (const pendingLoanScheme of list) {
      if (new BigNumber(block.height).gte(pendingLoanScheme.activateAfterBlock)) {
        await this.loanSchemeMapper.put(pendingLoanScheme)
        await this.deferredModelMapper.delete(pendingLoanScheme.id)
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
  }
}
