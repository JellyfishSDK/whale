import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
// import { VoutFinder } from '@src/module.indexer/model/_vout_finder'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { OraclePriceAggregation, OraclePriceAggregationMapper } from '@src/module.model/oracle.price'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceAggregationMapper
    // private readonly voutFinder: VoutFinder
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceAggregation> = {}

    function findOraclePriceAggregation (hex: string, type: string): OraclePriceAggregation {
      const hid = HexEncoder.asSHA256(hex)

      // if (hex.includes('6a414466547879')) {
      //   const buffer = SmartBuffer.fromBuffer(Buffer.from('5fe2c6c2e00f7c764d0386945fa61dccf01374b5d819efad5e9911c9f82fc60cefa369327a01000001055445534c41010355534400a3e11100000000', 'hex'))
      //   const composable: any = new CSetOracleData(buffer)
      // }

      if (records[hid] === undefined) {
        records[hid] = OraclePriceAggregationIndexer.newOraclePriceAggregation(
          block,
          hex,
          type,
          'APPL',
          'EUR',
          0
        )
      }

      return records[hid]
    }

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        // const aggregation =
        findOraclePriceAggregation(
          vout.scriptPubKey.hex,
          vout.scriptPubKey.type
        )
      }
    }

    for (const aggregation of Object.values(records)) {
      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const hidList = new Set<string>()

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        hidList.add(HexEncoder.asSHA256(vout.scriptPubKey.hex))
      }
    }

    for (const hid of hidList) {
      await this.mapper.delete(HexEncoder.encodeHeight(block.height) + hid)
    }
  }

  static newOraclePriceAggregation (
    block: RawBlock,
    hex: string,
    type: string,
    token: string,
    currency: string,
    timestamp: number
  ): OraclePriceAggregation {
    const hid = HexEncoder.asSHA256(hex)

    return {
      id: HexEncoder.encodeHeight(block.height) + hid,
      hid: hid,
      block: {
        hash: block.hash,
        height: block.height
      },
      script: {
        type: type,
        hex: hex
      },
      data: {
        token,
        currency,
        timestamp
      }
    }
  }
}
