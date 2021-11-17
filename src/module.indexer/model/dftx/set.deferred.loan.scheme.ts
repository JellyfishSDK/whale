import { Injectable, Logger } from '@nestjs/common'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { LoanScheme, CCreateLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistory } from '@src/module.model/loan.scheme.history'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'

@Injectable()
export class SetDeferredLoanSchemeIndexer extends DfTxIndexer<LoanScheme> {
  OP_CODE: number = CCreateLoanScheme.OP_CODE
  private readonly logger = new Logger(SetDeferredLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper,
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

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<LoanScheme>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const previous = await this.getPrevious(data.identifier)
      await this.loanSchemeMapper.put(previous)
      await this.deferredLoanSchemeMapper.delete(data.identifier)
      await this.loanSchemeHistoryMapper.delete(`${data.identifier}-${block.height}`)
    }
  }

  /**
   * Get previous loan scheme before current height
   */
  private async getPrevious (loanSchemeId: string): Promise<LoanSchemeHistory> {
    const histories = await this.loanSchemeHistoryMapper.query(loanSchemeId, 1)
    if (histories.length === 0) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', loanSchemeId)
    }

    return histories[0]
  }
}
