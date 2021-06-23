import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '@src/module.database/model'
import { Database, SortOrder } from '@src/module.database/database'
import { HexEncoder } from '@src/module.model/_hex.encoder'

const OraclePriceMapping: ModelMapping<OraclePrice> = {
  type: 'oracle_price',
  index: {
    hid_height: {
      name: 'oracle_price_hid_height',
      partition: {
        type: 'string',
        key: (d: OraclePrice) => d.hid
      },
      sort: {
        type: 'number',
        key: (d: OraclePrice) => d.block.height
      }
    }
  }
}

@Injectable()
export class OraclePriceMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (hid: string): Promise<OraclePrice | undefined> {
    const oraclePrices = await this.database.query(OraclePriceMapping.index.hid_height, {
      partitionKey: hid,
      order: SortOrder.DESC,
      limit: 1
    })
    return oraclePrices.length === 0 ? undefined : oraclePrices[0]
  }

  async query (hid: string, limit: number, lt?: number): Promise<OraclePrice[]> {
    return await this.database.query(OraclePriceMapping.index.hid_height, {
      partitionKey: hid,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (hid: string, height: number): Promise<OraclePrice | undefined> {
    return await this.database.get(OraclePriceMapping, HexEncoder.encodeHeight(height) + hid)
  }

  async put (oraclePrice: OraclePrice): Promise<void> {
    return await this.database.put(OraclePriceMapping, oraclePrice)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(OraclePriceMapping, id)
  }
}

export interface OraclePrice extends Model {
  id: string // ------------------| unique id of this output: block height + hid
  hid: string // -----------------| hashed id, for length compatibility reasons this is the hashed id of script

  block: {
    hash: string // --------------| block hash of this script aggregation
    height: number // ------------| block height of this script aggregation
  }

  script: {
    type: string // --------------| known type of the script
    hex: string // ---------------| script in encoded in hex
  }

  token: string
  currency: string
  timestamp: number
}
