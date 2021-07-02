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

  @Get('/tip')
  async getLatest (): Promise<Block | undefined> {
    const blocks = await this.blockMapper.queryByHeight(1)
    return blocks[0]
  }

  @Get('/:id')
  async getBlock (@Param('id') hash: string): Promise<Block | undefined> {
    return await this.blockMapper.getByHash(hash)
  }

  @Get('/:id/transactions')
  async getBlockTransactions (@Param('id') hash: string): Promise<Transaction[]> {
    return await this.transactionMapper.queryByBlockHash(hash, 100)
  }
}
