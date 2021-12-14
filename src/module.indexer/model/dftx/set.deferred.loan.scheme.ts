import { Injectable, Logger } from '@nestjs/common'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { SetLoanScheme, CSetLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper, LoanScheme } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistory, LoanSchemeHistoryEvent } from '@src/module.model/loan.scheme.history'
import { DeferredLoanScheme, DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class SetDeferredLoanSchemeIndexer extends DfTxIndexer<SetLoanScheme> {
  OP_CODE: number = CSetLoanScheme.OP_CODE
  private readonly logger = new Logger(SetDeferredLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper,
    private readonly deferredLoanSchemeMapper: DeferredLoanSchemeMapper
  ) {
    super()
  }

  async indexBlockStart (block: RawBlock): Promise<void> {
    const loop = async (activeAfterBlock: number, next?: number): Promise<void> => {
      const list = await this.deferredLoanSchemeMapper.query(activeAfterBlock, 100)
      const pending = list.filter(each => !each.activated)
      if (pending.length === 0) {
        return
      }
      for (const each of pending) {
        // check if the loanScheme exists, else its destroyed previously
        const exists = await this.loanSchemeMapper.get(each.loanSchemeId)
        if (exists === undefined) {
          return await this.deferredLoanSchemeMapper.delete(each.id)
        }
        await this.loanSchemeMapper.put(this.mapLoanScheme(each))
        await this.deferredLoanSchemeMapper.put({ ...each, activated: true })
      }
      return await loop(activeAfterBlock, list[list.length - 1].block.height)
    }

    return await loop(block.height)
  }

  private mapLoanScheme (deferredLoanScheme: DeferredLoanScheme): LoanScheme {
    return {
      id: deferredLoanScheme.loanSchemeId,
      sort: deferredLoanScheme.sort,
      minColRatio: deferredLoanScheme.minColRatio,
      interestRate: deferredLoanScheme.interestRate,
      activateAfterBlock: deferredLoanScheme.activateAfterBlock,
      block: deferredLoanScheme.block
    }
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanScheme>): Promise<void> {
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanScheme>): Promise<void> {
    const data = transaction.dftx.data

    const previous = await this.getPrevious(data.identifier, block)
    if (previous === undefined) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
    }

    const prevDeferred = await this.getPrevDeferred(data.identifier, block)
    if (prevDeferred === undefined) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
    }

    await this.deferredLoanSchemeMapper.put({
      id: prevDeferred.id,
      sort: prevDeferred.sort,
      loanSchemeId: prevDeferred.loanSchemeId,
      minColRatio: prevDeferred.minColRatio,
      interestRate: prevDeferred.interestRate,
      activateAfterBlock: prevDeferred.activateAfterBlock,
      activated: false,
      block: prevDeferred.block
    })

    await this.loanSchemeMapper.put({
      id: previous.loanSchemeId,
      sort: previous.sort.split('-')[1],
      minColRatio: previous.minColRatio,
      interestRate: previous.interestRate,
      activateAfterBlock: previous.activateAfterBlock,
      block: previous.block
    })
  }

  /**
   * Get previous active loan scheme
   */
  private async getPrevious (id: string, block: RawBlock): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (next: string, height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, next)
      if (list.length === 0) {
        return undefined
      }

      // get the closest activateAfterBlock against height
      // ensure its queried by DESC height
      // looking for the first height >= activateHeight
      const prevActiveLoanScheme = list.find(each => new BigNumber(height).gte(new BigNumber(each.activateAfterBlock)))
      if (prevActiveLoanScheme !== undefined) {
        return prevActiveLoanScheme
      }

      const last = list[list.length - 1]
      return await findInNextPage(last.sort, last.block.height)
    }
    return await findInNextPage(`${HexEncoder.encodeHeight(block.mediantime)}-${HexEncoder.encodeHeight(block.height)}`, block.height)
  }

  /**
   * Get prev deferred loan scheme
   */
  private async getPrevDeferred (id: string, block: RawBlock): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (next: string, height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, next)
      if (list.length === 0) {
        return undefined
      }

      const prevDeferred = list.find(each =>
        each.event === LoanSchemeHistoryEvent.UPDATE &&
        new BigNumber(height).eq(each.activateAfterBlock))

      if (prevDeferred !== undefined) {
        return prevDeferred
      }

      const last = list[list.length - 1]
      return await findInNextPage(last.sort, last.block.height)
    }

    return await findInNextPage(`${HexEncoder.encodeHeight(block.mediantime)}-${HexEncoder.encodeHeight(block.height)}`, block.height)
  }
}
