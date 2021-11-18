import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CUpdateLoanToken, UpdateLoanToken } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SYMBOL_LENGTH, Token, TokenMapper } from '@src/module.model/token'
import { LoanTokenMapper, LoanToken } from '@src/module.model/loan.token'
import { LoanTokenHistoryMapper } from '@src/module.model/loan.token.history'

@Injectable()
export class UpdateLoanTokenIndexer extends DfTxIndexer<UpdateLoanToken> {
  OP_CODE: number = CUpdateLoanToken.OP_CODE

  constructor (
    private readonly tokenMapper: TokenMapper,
    private readonly loanTokenMapper: LoanTokenMapper,
    private readonly loanTokenHistoryMapper: LoanTokenHistoryMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<UpdateLoanToken>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const [existingLoanToken, existingToken] = await this._findExisting(data.tokenTx)

      const symbol = data.symbol.trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH)
      const name = data?.name?.trim().substr(0, MAX_TOKEN_NAME_LENGTH) ?? data.symbol.trim().substr(0, MAX_TOKEN_NAME_LENGTH)
      const interest = data.interest.toFixed()
      const tokenCurrency = `${data.currencyPair.token}-${data.currencyPair.currency}`
      const blockObj = {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      }

      // update token
      await this.tokenMapper.put({
        ...existingToken,
        symbol: symbol,
        name: name,
        mintable: data.mintable
        // block: blockObj // TBD: this info can be referenced as token creation date
      })

      // update loan token
      await this.loanTokenMapper.put({
        ...existingLoanToken,
        interest: interest,
        tokenCurrency: tokenCurrency
        // block: blockObj // TBD: this info can be referenced as token creation date
      })

      // write new history
      await this.loanTokenHistoryMapper.put({
        id: `${block.height}-${data.tokenTx}`,
        loanTokenId: `${data.tokenTx}`,
        symbol: symbol,
        name: name,
        interest: interest,
        mintable: data.mintable,
        tokenCurrency: tokenCurrency,
        block: blockObj
      })
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<UpdateLoanToken>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const [existingLoanToken, existingToken] = await this._findExisting(data.tokenTx)

      const [lastVersion] = await this.loanTokenHistoryMapper.query(data.tokenTx, 1, `${block.height}`)

      // restore token
      await this.tokenMapper.put({
        ...existingToken,
        symbol: lastVersion.symbol,
        name: lastVersion.name,
        mintable: lastVersion.mintable
        // block: createOrUpdate.block // TBD: this info can be referenced as token creation date
      })

      // restore loan token
      await this.loanTokenMapper.put({
        ...existingLoanToken,
        interest: lastVersion.interest,
        tokenCurrency: lastVersion.tokenCurrency
        // block: createOrUpdate.block // TBD: this info can be referenced as token creation date
      })

      // delete update history
      await this.loanTokenHistoryMapper.delete(`${block.height}-${data.tokenTx}`)
    }
  }

  private async _findExisting (loanTokenId: string): Promise<[LoanToken, Token]> {
    const existingLoanToken = await this.loanTokenMapper.get(loanTokenId)
    if (existingLoanToken === undefined) {
      throw new Error(`Loan token id "${loanTokenId}" not found referenced in UpdateLoanToken`)
    }

    const existingToken = await this.tokenMapper.get(existingLoanToken.tokenId)
    if (existingToken === undefined) {
      throw new Error(`Token id "${existingLoanToken.tokenId}" not found referenced while updating ${loanTokenId}`)
    }

    return [existingLoanToken, existingToken]
  }
}
