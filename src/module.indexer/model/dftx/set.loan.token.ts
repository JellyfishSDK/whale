import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CSetLoanToken, SetLoanToken } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SYMBOL_LENGTH, TokenMapper } from '@src/module.model/token'
import BigNumber from 'bignumber.js'
import { LoanTokenMapper } from '@src/module.model/loan.token'
import { LoanTokenHistoryMapper } from '@src/module.model/loan.token.history'

@Injectable()
export class SetLoanTokenIndexer extends DfTxIndexer<SetLoanToken> {
  OP_CODE: number = CSetLoanToken.OP_CODE
  private readonly logger = new Logger(SetLoanTokenIndexer.name)

  constructor (
    private readonly tokenMapper: TokenMapper,
    private readonly loanTokenMapper: LoanTokenMapper,
    private readonly loanTokenHistoryMapper: LoanTokenHistoryMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanToken>): Promise<void> {
    const { txn } = transaction
    const { data } = transaction.dftx
    const tokenId = await this.tokenMapper.getNextTokenID(true)

    const symbol = data.symbol.trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH)
    const name = data?.name?.trim().substr(0, MAX_TOKEN_NAME_LENGTH) ?? data.symbol.trim().substr(0, MAX_TOKEN_NAME_LENGTH)
    const interest = data.interest.toFixed()
    const tokenCurrency = `${data.currencyPair.token}-${data.currencyPair.currency}`

    // create new token
    await this.tokenMapper.put({
      id: `${tokenId}`,
      sort: HexEncoder.encodeHeight(tokenId),
      symbol: symbol,
      name: name,
      isDAT: true,
      isLPS: false,
      limit: new BigNumber(0).toFixed(8),
      mintable: data.mintable,
      decimal: 8,
      tradeable: true,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      }
    })

    // create new loan token
    await this.loanTokenMapper.put({
      id: txn.txid,
      interest: interest,
      tokenCurrency: tokenCurrency,
      tokenId: `${tokenId}`,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      }
    })

    // create first history for new loan token
    await this.loanTokenHistoryMapper.put({
      id: `${block.height}-${txn.txid}`,
      loanTokenId: `${txn.txid}`,
      symbol: symbol,
      name: name,
      interest: interest,
      mintable: data.mintable,
      tokenCurrency: tokenCurrency,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      }
    })
  }

  async invalidateTransaction (block: RawBlock, txns: DfTxTransaction<SetLoanToken>): Promise<void> {
    const tokenId = await this.tokenMapper.getNextTokenID(true)
    await this.tokenMapper.delete(`${tokenId - 1}`)
    await this.loanTokenMapper.delete(txns.txn.txid)
    await this.loanTokenHistoryMapper.delete(`${block.height}-${txns.txn.txid}`)
  }
}
