import { Controller, Get, Param } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'
import { TransactionMapper, Transaction } from '@src/module.model/transaction'

@Controller('/v0/:network/block')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly transactionMapper: TransactionMapper
  ) {
  }

  @Get('/tip')
  async getLatest (): Promise<Block | undefined> {
    return await this.blockMapper.getHighest()
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
