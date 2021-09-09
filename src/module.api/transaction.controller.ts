import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { TransactionMapper, Transaction as ModelTransaction } from '@src/module.model/transaction'
import { Transaction } from '@whale-api-client/api/transactions'

import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { TransactionVin, TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVout, TransactionVoutMapper } from '@src/module.model/transaction.vout'

@Controller('/transactions')
export class TransactionController {
  constructor (
    protected readonly transactionMapper: TransactionMapper,
    protected readonly transactionVinMapper: TransactionVinMapper,
    protected readonly transactionVoutMapper: TransactionVoutMapper
  ) {
  }

  /**
   * Get a single transaction by txid
   *
   * @param {string} txid of transaction to query
   * @return{Promise<Transaction>}
   */
  @Get('/:txid')
  async get (@Param('txid') txid: string): Promise<Transaction> {
    const transaction = await this.transactionMapper.get(txid)

    if (transaction === undefined) {
      throw new NotFoundException('transaction not found')
    }

    return mapTransaction(transaction)
  }

  @Get('/:txid/vins')
  async getVins (@Param('txid') txid: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<TransactionVin>> {
    const vin = await this.transactionVinMapper.query(txid, query.size)

    return ApiPagedResponse.of(vin, query.size, vout => {
      return vout.id
    })
  }

  @Get('/:txid/vouts')
  async getVouts (@Param('txid') txid: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<TransactionVout>> {
    const vout = await this.transactionVoutMapper.query(txid, query.size)

    return ApiPagedResponse.of(vout, query.size, vout => {
      return vout.n.toString()
    })
  }
}

function mapTransaction (tx: ModelTransaction): Transaction {
  return {
    id: tx.id,
    block: tx.block,
    txid: tx.txid,
    hash: tx.hash,
    version: tx.version,
    size: tx.size,
    vSize: tx.vSize,
    weight: tx.weight,
    lockTime: tx.lockTime,
    vinCount: tx.vinCount,
    voutCount: tx.voutCount,
    totalVOut: tx.totalVOut
  }
}
