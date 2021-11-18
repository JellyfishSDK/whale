import { Injectable, Logger } from '@nestjs/common'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { LoanScheme, CCreateLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper, LoanScheme as LoanSchemeModel } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistory } from '@src/module.model/loan.scheme.history'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'

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
    const loop = async (activeAfterBlock: number, next?: number): Promise<void> => {
      const list = await this.deferredLoanSchemeMapper.query(activeAfterBlock, 100)
      if (list.length === 0) return
      for (const each of list) {
        await this.loanSchemeMapper.put(each)
        await this.deferredLoanSchemeMapper.delete(each.id)
      }
      return await loop(activeAfterBlock, list[list.length - 1].block.height)
    }

    return await loop(block.height)
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<LoanScheme>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const prevDeferredLoanScheme = await this.getCurrentLoanScheme(data.identifier)
      const prevLoanScheme = await this.getPrevLoanScheme(data.identifier, block.height)
      if (prevLoanScheme === undefined) {
        throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
      }
      await this.deferredLoanSchemeMapper.put(prevDeferredLoanScheme)
      await this.loanSchemeMapper.put(prevLoanScheme)
    }
  }

  /**
   * Get previous active loan scheme
   */
  private async getPrevLoanScheme (id: string, height: number): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, HexEncoder.encodeHeight(height))
      if (list.length === 0) return undefined

      const prevActiveLoanScheme = list.find(each => new BigNumber(height).gte(each.activateAfterBlock))
      if (prevActiveLoanScheme !== undefined) return prevActiveLoanScheme

      return await findInNextPage(list[0].block.height)
    }

    return await findInNextPage(height)
  }

  /**
   * Get current loan scheme which is prev deferred loan scheme
   */
  private async getCurrentLoanScheme (loanSchemeId: string): Promise<LoanSchemeModel> {
    const prevDeferredLoanScheme = await this.loanSchemeMapper.get(loanSchemeId)
    if (prevDeferredLoanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanScheme', loanSchemeId)
    }
    return prevDeferredLoanScheme
  }
}
