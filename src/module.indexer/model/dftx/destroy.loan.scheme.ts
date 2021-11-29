import { Injectable, Logger } from '@nestjs/common'
import { DestroyLoanScheme, CDestroyLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DeferredDestroyLoanSchemeMapper } from '@src/module.model/deferred.destroy.loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent, LoanSchemeHistory } from '@src/module.model/loan.scheme.history'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class DestroyLoanSchemeIndexer extends DfTxIndexer<DestroyLoanScheme> {
  OP_CODE: number = CDestroyLoanScheme.OP_CODE
  private readonly logger = new Logger(DestroyLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper,
    private readonly deferredDestroyLoanSchemeMapper: DeferredDestroyLoanSchemeMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<DestroyLoanScheme>): Promise<void> {
    const data = transaction.dftx.data
    const loanScheme = await this.loanSchemeMapper.get(data.identifier)
    if (loanScheme !== undefined) {
      if (this.isActive(data.height)) {
        await this.loanSchemeMapper.delete(data.identifier)
      } else {
        await this.deferredDestroyLoanSchemeMapper.put({
          id: `${data.identifier}-${block.height}`,
          sort: HexEncoder.encodeHeight(block.height),
          loanSchemeId: data.identifier,
          activateAfterBlock: data.height.toString(),
          block: {
            hash: block.hash,
            height: block.height,
            medianTime: block.mediantime,
            time: block.time
          },
          activated: false
        })
      }
      await this.loanSchemeHistoryMapper.put({
        id: `${data.identifier}-${block.height}`,
        loanSchemeId: data.identifier,
        sort: HexEncoder.encodeHeight(block.height),
        minColRatio: loanScheme.minColRatio,
        interestRate: loanScheme.interestRate,
        activateAfterBlock: data.height.toString(),
        event: LoanSchemeHistoryEvent.DESTROY,
        block: {
          hash: block.hash,
          height: block.height,
          medianTime: block.mediantime,
          time: block.time
        }
      })
    }
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<DestroyLoanScheme>): Promise<void> {
    const data = transaction.dftx.data

    if (this.isActive(data.height)) {
      const previous = await this.getPrevious(data.identifier, block.height)
      if (previous === undefined) {
        throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
      }
      await this.loanSchemeMapper.put({
        id: previous.loanSchemeId,
        sort: previous.sort,
        minColRatio: previous.minColRatio,
        interestRate: previous.interestRate,
        activateAfterBlock: previous.activateAfterBlock,
        block: previous.block
      })
    } else {
      await this.deferredDestroyLoanSchemeMapper.delete(`${data.identifier}-${block.height}`)
    }

    await this.loanSchemeHistoryMapper.delete(`${data.identifier}-${block.height}`)
  }

  private isActive (height: BigNumber): boolean {
    // zero means no activateHeight mentioned, do destroy now
    return height.eq(0)
  }

  /**
   * Get previous active loan scheme
   */
  private async getPrevious (id: string, height: number): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (height: number): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, HexEncoder.encodeHeight(height))
      if (list.length === 0) {
        return undefined
      }

      // get the closest activateAfterBlock against height
      // ensure its queried by DESC height
      // looking for the first height >= activateHeight
      const prevActiveLoanScheme = list.find(each => new BigNumber(height).gte(each.activateAfterBlock))
      if (prevActiveLoanScheme !== undefined) {
        return prevActiveLoanScheme
      }

      return await findInNextPage(list[list.length - 1].block.height)
    }
    return await findInNextPage(height)
  }
}
