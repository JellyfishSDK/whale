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
    console.log('query.size', query.size)

    if (query.next != null && isNumber(query.next)) {
      const next = parseInt(query.next)
      const blocks = await this.blockMapper.queryByHeight(query.size, next)
      return ApiPagedResponse.of(blocks, query.size, item => {
        return item.id
      })
    }

    return ApiPagedResponse.of(await this.blockMapper.queryByHeight(0), query.size, item => {
      return item.id
    })
  }

  @Get('/:id')
  async getBlock (@Param('id') id: string): Promise<Block | undefined> {
    const idIsNumber = isNumber(id)

    if (idIsNumber) {
      const height = parseInt(id)
      return await this.blockMapper.getByHeight(height)
    }
    // id is not a number

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

function isNumber (str: string): boolean {
  return /^-?\d+$/.test(str)
}
