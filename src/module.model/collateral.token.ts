import { Injectable } from '@nestjs/common'
import { SortOrder } from '@src/module.database/database'
import { ModelMapping } from '@src/module.database/model'
import { DeferableDftxMapper, DeferrableModel } from './_deferrable'

const CollateralTokenMapping: ModelMapping<CollateralToken> = {
  type: 'collateral_token',
  index: {
    all: {
      name: 'collateral_token_all',
      partition: {
        type: 'string',
        key: (t: CollateralToken) => t.id
      }
    }
  }
}

@Injectable()
export class CollateralTokenMapper extends DeferableDftxMapper<CollateralToken> {
  modelMapping = CollateralTokenMapping
  historyMapping = undefined

  async listAll (limit: number, lt?: number): Promise<CollateralToken[]> {
    return await this.database.query(CollateralTokenMapping.index.all, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }
}

export interface CollateralToken extends DeferrableModel {
  id: string // ---------------| tokenId

  factor: string // -----------| stringified bignumber
  token: {
    id: number
    symbol: string
  }
  tokenCurrency: string // ---| fixed Interval oracle symbol

  // inherited mandatory fields
  uniqueKey: string // --------| tokenId
  activationHeight: number
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
