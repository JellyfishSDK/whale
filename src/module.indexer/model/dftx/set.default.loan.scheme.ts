import { Injectable, Logger } from '@nestjs/common'
import { SetDefaultLoanScheme, CSetDefaultLoanScheme } from '@defichain/jellyfish-transaction'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper /* LoanSchemeHistoryEvent, LoanSchemeHistory */ } from '@src/module.model/loan.scheme.history'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
// import { HexEncoder } from '@src/module.model/_hex.encoder'
// import BigNumber from 'bignumber.js'
// import { NotFoundIndexerError } from '@src/module.indexer/error'

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
    console.log('data: ', data)
    // const isExists = await this.has(data.identifier)
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<SetDefaultLoanScheme>): Promise<void> {
  }

  private async has (id: string): Promise<boolean> {
    return (await this.loanSchemeMapper.get(id)) !== undefined
  }
}
