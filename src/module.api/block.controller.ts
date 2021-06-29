import { Controller, Get, Param } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'

@Controller('/v0/:network/block')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper
  ) {
  }

  @Get('/tip')
  async getBlockTip (): Promise<Block | undefined> {
    return await this.blockMapper.getHighest()
  }

  @Get('/:id')
  async getBlockByHash (@Param('id') hash: string): Promise<Block | undefined> {
    return await this.blockMapper.getByHash(hash)
  }
}
