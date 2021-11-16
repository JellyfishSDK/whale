import { Injectable, Logger } from '@nestjs/common'
import { LoanScheme, CCreateLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemePendingMapper } from '@src/module.model/loan.scheme.pending'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent, LoanSchemeHistory } from '@src/module.model/loan.scheme.history'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class SetLoanSchemeIndexer extends DfTxIndexer<LoanScheme> {
  OP_CODE: number = CCreateLoanScheme.OP_CODE
  private readonly logger = new Logger(SetLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemePendingMapper: LoanSchemePendingMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<LoanScheme>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      if (data.update.eq(0) || data.update.gte(new BigNumber(block.height))) {
        await this.loanSchemeMapper.put({
          id: data.identifier,
          ratio: data.ratio,
          rate: new BigNumber(data.rate),
          activateAfterBlock: data.update,

          block: {
            hash: block.hash,
            height: block.height,
            medianTime: block.mediantime,
            time: block.time
          }
        })
      } else {
        await this.loanSchemePendingMapper.put({
          id: data.identifier,
          ratio: data.ratio,
          rate: new BigNumber(data.rate),
          activateAfterBlock: data.update,

          block: {
            hash: block.hash,
            height: block.height,
            medianTime: block.mediantime,
            time: block.time
          }
        })
      }

      await this.loanSchemeHistoryMapper.put({
        id: `${data.identifier}-${block.height}`,
        loanSchemeId: data.identifier,
        sort: HexEncoder.encodeHeight(block.height),
        ratio: data.ratio,
        rate: new BigNumber(data.rate),
        activateAfterBlock: data.update,
        event: data.update.eq(0) ? LoanSchemeHistoryEvent.CREATE : LoanSchemeHistoryEvent.UPDATE,

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
      const previous = await this.getPrevious(data.identifier)
      await this.loanSchemeMapper.put(previous)
      await this.loanSchemePendingMapper.delete(data.identifier)
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
