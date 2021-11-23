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
    const queries = list.map(async each => await this.loanSchemeMapper.put({ ...each, default: false }))
    await Promise.all(queries)

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
    const data = transaction.dftx.data
    const loanScheme = await this.loanSchemeMapper.get(data.identifier)
    if (loanScheme === undefined) {
      throw new NotFoundIndexerError('index', 'LoanScheme', data.identifier)
    }
  }

  private async getPrevious (id: string): Promise<LoanSchemeHistory | undefined> {
    const list = await this.loanSchemeHistoryMapper.query(id, 1)
    if (list.length === 0) {
      return undefined
    }
    return list[0]
  }
}
