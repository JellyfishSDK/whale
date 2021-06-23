import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { OraclePriceAggregation, OraclePriceAggregationMapper } from '@src/module.model/oracle.price.aggregation'
import { SmartBuffer } from 'smart-buffer'
import { CSetOracleData } from '@defichain/jellyfish-transaction'

@Injectable()
export class OraclePriceAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: OraclePriceAggregationMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, OraclePriceAggregation> = {}

    function findOraclePriceAggregation (hex: string, type: string): OraclePriceAggregation {
      try {
        if (hex.startsWith('6a414466547879')) {
          const data = hex.replace('6a414466547879', '')
          const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
          const composable: any = new CSetOracleData(buffer)
          console.log(hex)
          console.log(composable)
        }
      } catch (e) {

      }

      const hid = HexEncoder.asSHA256(hex)

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

    for (const txn of block.tx) {
      console.log(txn.hex)
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
