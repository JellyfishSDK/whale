import { Injectable, Logger } from '@nestjs/common'
import { LoanScheme, CCreateLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent } from '@src/module.model/loan.scheme.history'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import BigNumber from 'bignumber.js'

@Injectable()
export class CreateLoanSchemeIndexer extends DfTxIndexer<LoanScheme> {
  OP_CODE: number = CCreateLoanScheme.OP_CODE
  private readonly logger = new Logger(CreateLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<LoanScheme>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      await this.loanSchemeMapper.put({
        id: data.identifier,
        ratio: data.ratio,
        rate: new BigNumber(data.rate),
        activationHeight: 0,

        block: {
          hash: block.hash,
          height: block.height,
          medianTime: block.mediantime,
          time: block.time
        }
      })

      await this.loanSchemeHistoryMapper.put({
        id: `${data.identifier}-${block.height}`,
        loanSchemeId: data.identifier,
        ratio: data.ratio,
        rate: new BigNumber(data.rate),
        activationHeight: 0,
        event: LoanSchemeHistoryEvent.CREATE,

        block: {
          hash: block.hash,
          height: block.height,
          medianTime: block.mediantime,
          time: block.time
        }
      })
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<LoanScheme>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      await this.loanSchemeMapper.delete(data.identifier)
      await this.loanSchemeHistoryMapper.delete(`${data.identifier}-${block.height}`)
    }
  }
}
