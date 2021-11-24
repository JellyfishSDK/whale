import { Injectable, Logger } from '@nestjs/common'
import { SetDefaultLoanScheme, CSetDefaultLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
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

    // set all default:false
    const list = await this.loanSchemeMapper.query(Number.MAX_SAFE_INTEGER)
    const reset = list.map(async each => await this.loanSchemeMapper.put({ ...each, default: false }))
    await Promise.all(reset)

    // update history
    const rest = list.filter(each => each.id !== data.identifier)
    const items = await Promise.all(rest.map(async each => await this.loanSchemeHistoryMapper.getLatest(each.id))) as LoanSchemeHistory[]
    await Promise.all(items.map(async item => await this.loanSchemeHistoryMapper.put({
      ...item,
      default: false,
      id: `${item.loanSchemeId}-${block.height}`,
      sort: HexEncoder.encodeHeight(block.height),
      event: LoanSchemeHistoryEvent.UNSET_DEFAULT
    })))

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
    const list = await this.loanSchemeMapper.query(Number.MAX_SAFE_INTEGER)
    for (const each of list) {
      const previous = await this.loanSchemeHistoryMapper.getLatest(each.id)
      if (previous === undefined) {
        throw new NotFoundIndexerError('index', 'LoanSchemeHistory', each.id)
      }
      await this.loanSchemeMapper.put({ ...each, default: previous.default, block: previous.block })
      await this.loanSchemeHistoryMapper.delete(previous.id)
    }
  }
}
