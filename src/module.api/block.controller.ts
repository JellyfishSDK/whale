import { Controller, Get, Param, Query } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'
import { TransactionMapper, Transaction } from '@src/module.model/transaction'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

export function parseHeight (str?: string): number | undefined {
  if (str !== undefined && /^\d+$/.test(str)) {
    return parseInt(str)
  }
}

@Controller('/v0/:network/blocks')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly transactionMapper: TransactionMapper
  ) {
  }

  @Get('')
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<Block>> {
    const height = parseHeight(query.next)
    const blocks = await this.blockMapper.queryByHeight(query.size, height)
    return ApiPagedResponse.of(blocks, query.size, item => {
      return item.id
    })
  }

  @Get('/:id')
  async get (@Param('id') id: string): Promise<Block | undefined> {
    const height = parseHeight(id)

    if (height !== undefined) {
      return await this.blockMapper.getByHeight(height)
    }

    return await this.blockMapper.getByHash(id)
  }

  @Get('/:id/transactions')
  async getBlockTransactions (@Param('id') id: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<Transaction>> {
    const height = parseHeight(id)

    if (height !== undefined) { // if id is height
      const block = await this.blockMapper.getByHeight(height)

      if (block !== undefined) { // type guard
        return ApiPagedResponse.of(await this.transactionMapper.queryByBlockHash(block.id, query.size, query.next), query.size, transaction => {
          return transaction.id
        })
      }
    }

    const transactions = await this.transactionMapper.queryByBlockHash(id, query.size, query.next)

    return ApiPagedResponse.of(transactions, query.size, transaction => {
      return transaction.id
    })
  }
}
