import { Controller, Get } from '@nestjs/common'
import { Block, BlockMapper } from '@src/module.model/block'

@Controller('/v1/:network/block')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper
  ) {
  }

  @Get('/tip')
  async getBlockTip (): Promise<Block | undefined> {
    return await this.blockMapper.getHighest()
  }
}
