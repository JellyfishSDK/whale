import { Model } from '@src/module.database/models/_model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

@Injectable()
export class BlockDbMapper {
  public constructor (protected readonly database: Database) {
  }

  async getByHash (hash: string): Promise<Block | undefined> {
    return await this.database.get(Block, 'hash', hash)
  }

  async getByHeight (height: number): Promise<Block | undefined> {
    return await this.database.get(Block, 'height', height)
  }

  async getBest (): Promise<Block | undefined> {
    const blocks = await this.database.query<Block>(Block, 'height', {
      order: SortOrder.DESC,
      limit: 1
    })
    return blocks.length === 0 ? undefined : blocks[0]
  }

  async queryByHeight (limit: number, start?: number): Promise<Block[]> {
    return await this.database.query(Block, 'height', {
      limit: limit,
      order: SortOrder.DESC,
      lt: start
    })
  }

  async put (model: Block): Promise<void> {
    return await this.database.put(model)
  }

  async delete (hash: string): Promise<void> {
    const model = await this.database.get(Block, 'hash', hash)
    if (model !== undefined) {
      await this.database.delete(model)
    }
  }
}

/**
 * Information about a block in the best chain.
 */
export class Block extends Model {
  _type = Block
  _index = {
    hash: {
      partitionKey: () => this.hash
    },
    height: {
      partitionKey: () => this.height
    }
  }

  hash!: string
  previous_hash!: string

  height!: number
  version!: number
  time!: number // --------------| block time in seconds since epoch
  median_time!: number // -------| median time of the past 11 block timestamps

  transaction_count!: number

  difficulty!: number // --------| difficulty of the block.

  masternode!: string
  minter!: string
  minter_block_count!: number

  stake_modifier!: string
  merkleroot!: string

  size!: number // --------------| block size in bytes
  size_stripped!: number // -----| block size in bytes, excluding witness data.
  weight!: number // ------------| block weight as defined in BIP 141
}
