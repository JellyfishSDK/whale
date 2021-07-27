import { Controller, Get, Param, Query } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'
import { TransactionMapper, Transaction } from '@src/module.model/transaction'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

export function parseHeight (str: string | undefined): number | undefined {
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
      return item.height.toString()
    })
  }

  @Get('/:id')
  async get (@Param('id') id: string): Promise<Block | undefined> {
    const block = await this.parseHeightAndGetBlock(id)

    return block !== undefined ? block : await this.blockMapper.getByHash(id)
  }

  @Get('/:id/transactions')
  async getBlockTransactions (@Param('id') id: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<Transaction>> {
    const block = await this.parseHeightAndGetBlock(id)

    const transactions = await this.transactionMapper.queryByBlockHash((block !== undefined) ? block.id : id, query.size, query.next)

    return ApiPagedResponse.of(transactions, query.size, transaction => {
      return transaction.id
    })
  }

  async parseHeightAndGetBlock (str?: string): Promise<Block | undefined> {
    const height = parseHeight(str)
    if (height !== undefined) {
      return await this.blockMapper.getByHeight(height)
    }
  }
}
