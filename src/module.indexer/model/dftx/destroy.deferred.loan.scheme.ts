import { Injectable, Logger } from '@nestjs/common'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DestroyLoanScheme, CDestroyLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistory, LoanSchemeHistoryEvent } from '@src/module.model/loan.scheme.history'
import { DeferredDestroyLoanSchemeMapper } from '@src/module.model/deferred.destroy.loan.scheme'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class DestroyDeferredLoanSchemeIndexer extends DfTxIndexer<DestroyLoanScheme> {
  OP_CODE: number = CDestroyLoanScheme.OP_CODE
  private readonly logger = new Logger(DestroyDeferredLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper,
    private readonly deferredDestroyLoanSchemeMapper: DeferredDestroyLoanSchemeMapper,
    private readonly deferredLoanSchemeMapper: DeferredLoanSchemeMapper
  ) {
    super()
  }

  async indexBlockStart (block: RawBlock): Promise<void> {
    const loop = async (activeAfterBlock: number, next?: number): Promise<void> => {
      const list = await this.deferredDestroyLoanSchemeMapper.query(activeAfterBlock, 100)
      if (list.length === 0) {
        return
      }
      for (const each of list) {
        await this.loanSchemeMapper.delete(each.loanSchemeId)
        await this.deferredDestroyLoanSchemeMapper.delete(each.id)

        // delete the coming "UPDATE" deferredLoanScheme if any
        // activateAfterBlock: 110
        // destroyLoanScheme.id: s250-104
        await this.deferredLoanSchemeMapper.delete(each.id)
      }
      return await loop(activeAfterBlock, list[list.length - 1].block.height)
    }

    return await loop(block.height)
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<DestroyLoanScheme>): Promise<void> {
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<DestroyLoanScheme>): Promise<void> {
    const data = transaction.dftx.data
    const prevDeferredDestroyLoanScheme = await this.getPrevDeferredDestroyLoanScheme(data.identifier, block.height)
    if (prevDeferredDestroyLoanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
    }
    const prevDeferredLoanScheme = await this.getPrevDeferredLoanScheme(data.identifier, block.height)
    if (prevDeferredLoanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
    }
    const prevLoanScheme = await this.getPrevLoanScheme(data.identifier, block.height)
    if (prevLoanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
    }
    await this.deferredDestroyLoanSchemeMapper.put(prevDeferredDestroyLoanScheme)
    await this.loanSchemeMapper.put(prevLoanScheme)
  }

  /**
   * Get previous active loan scheme
   */
  private async getPrevLoanScheme (id: string, height: number): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, HexEncoder.encodeHeight(height))
      if (list.length === 0) {
        return undefined
      }

      const prevActiveLoanScheme = list.find(each => new BigNumber(height).gte(each.activateAfterBlock))
      if (prevActiveLoanScheme !== undefined) {
        return prevActiveLoanScheme
      }

      return await findInNextPage(list[list.length - 1].block.height)
    }

    return await findInNextPage(height)
  }

  /**
   * Get previous deferred destroy loan scheme
   */
  private async getPrevDeferredDestroyLoanScheme (id: string, height: number): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, HexEncoder.encodeHeight(height))
      if (list.length === 0) {
        return undefined
      }

      const prevDeferredDestroyLoanScheme = list.find(each =>
        each.event === LoanSchemeHistoryEvent.DESTROY &&
        new BigNumber(height).eq(each.activateAfterBlock)
      )
      if (prevDeferredDestroyLoanScheme !== undefined) {
        return prevDeferredDestroyLoanScheme
      }

      return await findInNextPage(list[list.length - 1].block.height)
    }

    return await findInNextPage(height)
  }

  /**
   * Get previous deferred loan scheme
   */
  private async getPrevDeferredLoanScheme (id: string, height: number): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, HexEncoder.encodeHeight(height))
      if (list.length === 0) {
        return undefined
      }

      const prevDeferredLoanScheme = list.find(each =>
        each.event === LoanSchemeHistoryEvent.UPDATE &&
        new BigNumber(height).eq(each.activateAfterBlock)
      )
      if (prevDeferredLoanScheme !== undefined) {
        return prevDeferredLoanScheme
      }

      return await findInNextPage(list[list.length - 1].block.height)
    }

    return await findInNextPage(height)
  }
}
