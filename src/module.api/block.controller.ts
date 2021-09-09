import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { BlockMapper, Block as ModelBlock } from '@src/module.model/block'
import { Block } from '@whale-api-client/api/blocks'
import { Transaction, TransactionMapper } from '@src/module.model/transaction'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

export function parseHeight (str: string | undefined): number | undefined {
  if (str !== undefined && /^\d+$/.test(str)) {
    return parseInt(str)
  }
}

export function isSHA256Hash (str: string | undefined): boolean {
  return str !== undefined ? !(str.match(/^[0-f]{64}$/) == null) : false
}

@Controller('/blocks')
export class BlockController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly transactionMapper: TransactionMapper
  ) {
  }

  @Get()
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<Block>> {
    const height = parseHeight(query.next)
    const blocks = await this.blockMapper.queryByHeight(query.size, height)
    return ApiPagedResponse.of(blocks.map(block => mapBlock(block)), query.size, item => {
      return item.height.toString()
    })
  }

  @Get('/:id')
  async get (@Param('id') hashOrHeight: string): Promise<Block | undefined> {
    const height = parseHeight(hashOrHeight)
    if (height !== undefined) {
      const block = await this.blockMapper.getByHeight(height)
      if (block === undefined) {
        throw new NotFoundException('Unable to find block')
      }

      return mapBlock(block)
    }

    if (isSHA256Hash(hashOrHeight)) {
      const block = await this.blockMapper.getByHash(hashOrHeight)
      if (block === undefined) {
        throw new NotFoundException('Unable to find block')
      }

      return mapBlock(block)
    }
  }

  @Get('/:hash/transactions')
  async getTransactions (@Param('hash') hash: string, @Query() query: PaginationQuery): Promise<ApiPagedResponse<Transaction>> {
    if (!isSHA256Hash(hash)) {
      return ApiPagedResponse.empty()
    }

    const transactions = await this.transactionMapper.queryByBlockHash(hash, query.size, query.next)
    return ApiPagedResponse.of(transactions, query.size, transaction => {
      return transaction.id
    })
  }
}

function mapBlock (block: ModelBlock): Block {
  return {
    id: block.id,
    hash: block.hash,
    previousHash: block.previousHash,
    height: block.height,
    version: block.version,
    time: block.time,
    medianTime: block.medianTime,
    transactionCount: block.transactionCount,
    difficulty: block.difficulty,
    masternode: block.masternode,
    minter: block.minter,
    minterBlockCount: block.minterBlockCount,
    stakeModifier: block.stakeModifier,
    merkleroot: block.merkleroot,
    size: block.size,
    sizeStripped: block.sizeStripped,
    weight: block.weight,
    reward: block.reward
  }
}
