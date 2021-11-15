import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const CollateralTokenMapping: ModelMapping<CollateralToken> = {
  type: 'collateral_token',
  index: {
    keySort: {
      name: 'collateral_token_key_sort',
      partition: {
        type: 'number',
        key: (t: CollateralToken) => t.token.id
      },
      sort: {
        type: 'number',
        key: (t: CollateralToken) => t.block.height
      }
    }
  }
}

@Injectable()
export class CollateralTokenMapper {
  public constructor (protected readonly database: Database) {
  }

  /**
   * Get for particular token.
   *
   * @param {number} tokenId
   * @param {number} lt
   * @returns {Promise<CollateralToken | undefined>}
   */
  async getActiveCollateralToken (tokenId: number, maxActivationHeight: number): Promise<CollateralToken | undefined> {
    const findInNextPage = async (height: number): Promise<CollateralToken | undefined> => {
      const list = await this.getCollateralTokenHistory(tokenId, 100, height)
      if (list.length === 0) return undefined

      const activated = list.find(ct => ct.activateAfterBlock <= maxActivationHeight)
      if (activated !== undefined) return activated

      return await findInNextPage(list[list.length - 1].block.height)
    }

    return await findInNextPage(Number.MAX_SAFE_INTEGER)
  }

  async getCollateralTokenHistory (tokenId: number, limit: number = 100, lt?: number): Promise<CollateralToken[]> {
    return await this.database.query(CollateralTokenMapping.index.sort, {
      limit: limit,
      partitionKey: tokenId,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async query (limit: number, lt?: string): Promise<CollateralToken[]> {
    return await this.database.query(CollateralTokenMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  /**
   * Get by unique id
   *
   * @param {string} id `tokenId-height`
   * @returns {Promise<CollateralToken | undefined>}
   */
  async get (id: string): Promise<CollateralToken | undefined> {
    return await this.database.get(CollateralTokenMapping, id)
  }

  async put (token: CollateralToken): Promise<void> {
    return await this.database.put(CollateralTokenMapping, token)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(CollateralTokenMapping, id)
  }
}

export interface CollateralToken extends Model {
  id: string // ---------------| tokenId-height
  sort: string // -------------| height (hex encoded)

  factor: string // -----------| stringified bignumber
  activateAfterBlock: number

  token: {
    id: number
    symbol: string
  }

  priceFeed: string // -------| fixed Interval oracle symbol

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
