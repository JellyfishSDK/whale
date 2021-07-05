import { Controller, Get, Param, Query } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'
import { TransactionMapper, Transaction } from '@src/module.model/transaction'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

@Controller('/v0/:network/blocks')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly transactionMapper: TransactionMapper
  ) {
  }

  @Get('')
  async listBlocks (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<Block>> {
    const blocks = await this.blockMapper.queryByHeight(query.size, query.next)

    return ApiPagedResponse.of(blocks, query.size, item => {
      return item.id
    })
  }

  @Get('/:id')
  async getBlock (@Param('id') id: string): Promise<Block | undefined> {
    const height = parseInt(id)

    if (!isNaN(height)) {
      // id is a number, assume user trying to get by height
      return await this.blockMapper.getByHeight(height)
    }

    // assume valid hash string
    return await this.blockMapper.getByHash(id)
  }

  @Get('/:id/transactions')
  async getBlockTransactions (@Param('id') hash: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<Transaction>> {
    const transactions = await this.transactionMapper.queryByBlockHash(hash, query.size, query.next)

    return ApiPagedResponse.of(transactions, query.size, transaction => {
      return transaction.id
    })
  }
}
