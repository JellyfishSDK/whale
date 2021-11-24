import { Injectable, Logger } from '@nestjs/common'
import { SetLoanScheme, CSetLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent, LoanSchemeHistory } from '@src/module.model/loan.scheme.history'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class SetLoanSchemeIndexer extends DfTxIndexer<SetLoanScheme> {
  OP_CODE: number = CSetLoanScheme.OP_CODE
  private readonly logger = new Logger(SetLoanSchemeIndexer.name)

  constructor (
    private readonly loanSchemeMapper: LoanSchemeMapper,
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper,
    private readonly deferredLoanSchemeMapper: DeferredLoanSchemeMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanScheme>): Promise<void> {
    const data = transaction.dftx.data

    const loanScheme = await this.loanSchemeMapper.get(data.identifier)
    if (loanScheme !== undefined) {
      return await this.update(block, data, loanScheme.default)
    }

    return await this.create(block, data)
  }

  private async create (block: RawBlock, data: SetLoanScheme): Promise<void> {
    const isFirst = await this.first()

    const loanScheme = {
      id: data.identifier,
      ratio: data.ratio,
      rate: new BigNumber(data.rate),
      activateAfterBlock: data.update,
      default: !!isFirst,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    }

    if (this.isActive(data, block.height)) {
      await this.loanSchemeMapper.put(loanScheme)
    } else {
      await this.deferredLoanSchemeMapper.put({
        ...loanScheme,
        loanSchemeId: data.identifier,
        id: `${data.identifier}-${block.height}`
      })
    }

    await this.loanSchemeHistoryMapper.put({
      ...loanScheme,
      id: `${data.identifier}-${block.height}`,
      loanSchemeId: data.identifier,
      sort: HexEncoder.encodeHeight(block.height),
      event: LoanSchemeHistoryEvent.CREATE
    })
  }

  private async update (block: RawBlock, data: SetLoanScheme, isDefault: boolean): Promise<void> {
    const metadata = {
      id: data.identifier,
      ratio: data.ratio,
      rate: new BigNumber(data.rate),
      activateAfterBlock: data.update,
      default: isDefault, // refer to previous state
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    }

    if (this.isActive(data, block.height)) {
      await this.loanSchemeMapper.put(metadata)
    } else {
      await this.deferredLoanSchemeMapper.put({
        ...metadata,
        loanSchemeId: data.identifier,
        id: `${data.identifier}-${block.height}`
      })
    }

    await this.loanSchemeHistoryMapper.put({
      ...metadata,
      id: `${data.identifier}-${block.height}`,
      loanSchemeId: data.identifier,
      sort: HexEncoder.encodeHeight(block.height),
      event: LoanSchemeHistoryEvent.UPDATE
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanScheme>): Promise<void> {
    const data = transaction.dftx.data

    if (this.isActive(data, block.height)) {
      const previous = await this.getPrevious(data.identifier, block.height)
      if (previous === undefined) {
        throw new NotFoundIndexerError('index', 'LoanSchemeHistory', data.identifier)
      }
      await this.loanSchemeMapper.put({
        id: previous.loanSchemeId,
        ratio: previous.ratio,
        rate: previous.rate,
        activateAfterBlock: previous.activateAfterBlock,
        default: previous.default,
        block: previous.block
      })
    } else {
      await this.deferredLoanSchemeMapper.delete(`${data.identifier}-${block.height}`)
    }

    await this.loanSchemeHistoryMapper.delete(`${data.identifier}-${block.height}`)
  }

  private async first (): Promise<boolean> {
    const list = await this.loanSchemeMapper.query(Number.MAX_SAFE_INTEGER)
    return list.length === 0
  }

  private isActive (loanScheme: SetLoanScheme, height: number): boolean {
    return loanScheme.update.eq(0) ||
           loanScheme.update.eq(new BigNumber('0xffffffffffffffff')) ||
           new BigNumber(height).gte(loanScheme.update)
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
