import { Injectable, Logger } from '@nestjs/common'
import { SetDefaultLoanScheme, CSetDefaultLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper, LoanScheme } from '@src/module.model/loan.scheme'
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
    private readonly loanSchemeHistoryMapper: LoanSchemeHistoryMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetDefaultLoanScheme>): Promise<void> {
    const data = transaction.dftx.data

    const loanScheme = await this.loanSchemeMapper.get(data.identifier)
    if (loanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanScheme', data.identifier)
    }

    await this.setAllFalsyDefault(data.identifier, block.height)

    // set the target loan scheme to default:true
    await this.loanSchemeMapper.put({
      ...loanScheme,
      default: true,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    })

    await this.loanSchemeHistoryMapper.put({
      ...loanScheme,
      default: true,
      id: `${data.identifier}-${block.height}`,
      loanSchemeId: data.identifier,
      sort: HexEncoder.encodeHeight(block.height),
      event: LoanSchemeHistoryEvent.SET_DEFAULT
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<SetDefaultLoanScheme>): Promise<void> {
    const loop = async (next?: string): Promise<void> => {
      const list = await this.loanSchemeMapper.query(100, next)
      if (list.length === 0) {
        return
      }
      const prevIds: string[] = []
      const previous: LoanScheme[] = await Promise.all(list.map(async each => {
        const prev = await this.loanSchemeHistoryMapper.getLatest(each.id)
        if (prev === undefined) {
          throw new NotFoundIndexerError('index', 'LoanSchemeHistory', each.id)
        }
        prevIds.push(prev.id)
        return {
          id: prev.loanSchemeId,
          ratio: prev.ratio,
          rate: prev.rate,
          activateAfterBlock: prev.activateAfterBlock,
          default: prev.default,
          block: prev.block
        }
      }))
      // overwrite all previous record
      await Promise.all(previous.map(async prev => await this.loanSchemeMapper.put(prev)))
      // delete all the new history record
      await Promise.all(prevIds.map(async id => await this.loanSchemeHistoryMapper.delete(id)))

      return await loop(list[list.length - 1].id)
    }
    return await loop()
  }

  private async setAllFalsyDefault (id: string, height: number): Promise<void> {
    const loop = async (next?: string): Promise<void> => {
      const list = await this.loanSchemeMapper.query(100, next)
      if (list.length === 0) {
        return
      }
      const reset = list.map(async each => await this.loanSchemeMapper.put({ ...each, default: false }))
      await Promise.all(reset)

      // update history
      const rest = list.filter(each => each.id !== id)
      const items = await Promise.all(rest.map(async each => await this.loanSchemeHistoryMapper.getLatest(each.id))) as LoanSchemeHistory[]
      await Promise.all(items.map(async item => await this.loanSchemeHistoryMapper.put({
        ...item,
        default: false,
        id: `${item.loanSchemeId}-${height}`,
        sort: HexEncoder.encodeHeight(height),
        event: LoanSchemeHistoryEvent.UNSET_DEFAULT
      })))

      return await loop(list[list.length - 1].id)
    }
    return await loop()
  }
}
