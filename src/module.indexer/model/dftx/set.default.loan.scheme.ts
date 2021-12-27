import { Injectable, Logger } from '@nestjs/common'
import { SetDefaultLoanScheme, CSetDefaultLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DefaultLoanSchemeMapper } from '@src/module.model/default.loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent, LoanSchemeHistory } from '@src/module.model/loan.scheme.history'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class SetDefaultLoanSchemeIndexer extends DfTxIndexer<SetDefaultLoanScheme> {
  OP_CODE: number = CSetDefaultLoanScheme.OP_CODE
  private readonly logger = new Logger(SetDefaultLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper,
    private readonly defaultLoanSchemeMapper: DefaultLoanSchemeMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetDefaultLoanScheme>, txIndex = 0): Promise<void> {
    const data = transaction.dftx.data
    const txid = transaction.txn.txid

    const loanScheme = await this.loanSchemeMapper.get(data.identifier)
    if (loanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanScheme', data.identifier)
    }
    await this.defaultLoanSchemeMapper.put({ id: 'defaultLoanScheme', loanSchemeId: loanScheme.id })

    await this.loanSchemeHistoryMapper.put({
      ...loanScheme,
      id: `${data.identifier}-${txid}`,
      loanSchemeId: data.identifier,
      sort: `${HexEncoder.encodeHeight(block.height)}-${txIndex}-${txid}`,
      event: LoanSchemeHistoryEvent.SET_DEFAULT
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<SetDefaultLoanScheme>, txIndex = 0): Promise<void> {
    const data = transaction.dftx.data
    const txid = transaction.txn.txid

    const prevDefault = await this.getPrevious(data.identifier, block.height, txid, txIndex)
    if (prevDefault === undefined) {
      throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
    }
  }

  /**
   * Get previous default loan scheme
   */
  private async getPrevious (id: string, height: number, txid: string, txIndex: number): Promise<LoanSchemeHistory | undefined> {
    const findInNextPage = async (next: string): Promise<LoanSchemeHistory | undefined> => {
      const list = await this.loanSchemeHistoryMapper.query(id, 100, next)
      if (list.length === 0) {
        return undefined
      }

      // order by DESC order
      // looking for the first loan scheme SET_DEFAULT event
      const prevDefaultLoanScheme = list.find(each => each.event === LoanSchemeHistoryEvent.SET_DEFAULT)
      if (prevDefaultLoanScheme !== undefined) {
        return prevDefaultLoanScheme
      }

      return await findInNextPage(list[list.length - 1].sort)
    }

    const sort = `${HexEncoder.encodeHeight(height)}-${txIndex}-${txid}`
    return await findInNextPage(sort)
  }
}
