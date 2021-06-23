import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { SmartBuffer } from 'smart-buffer'
import { CSetOracleData } from '@defichain/jellyfish-transaction'
import { JellyfishJSON } from '@defichain/jellyfish-api-core'
// import { BufferComposer, ComposableBuffer } from "@defichain/jellyfish-transaction/dist/buffer/buffer_composer";
// import BigNumber from "bignumber.js";

@Injectable()
export class OraclePriceIndexer extends Indexer {
  // constructor (
  //   //private readonly mapper: OraclePriceMapper,
  // ) {
  //   super()
  // }

  async index (block: RawBlock): Promise<void> {
    // const records: Record<string, OraclePrice> = {}

    for (const txn of block.tx) {
      try {
        const buffer = SmartBuffer.fromBuffer(Buffer.from(txn.hex, 'hex'))
        const composable: any = new CSetOracleData(buffer)
        console.log(JellyfishJSON.stringify(composable))
      } catch (e) {
        console.log(12345)
        console.log(e)
      }
    }
  }

  // async index (block: RawBlock): Promise<void> {
  //   for (const txn of block.tx) {
  //     for (const vin of txn.vin) {
  //       const txn = block.tx.find(tx => tx.txid === vin.txid)
  //       const vout = txn?.vout.find(vout => vout.n === vin.vout)
  //       //if(vout?.scriptPubKey.hex.includes('6a414466547879')){
  //       if(vout?.scriptPubKey.hex){
  //         const buffer = SmartBuffer.fromBuffer(Buffer.from(vout?.scriptPubKey.hex, 'hex'))
  //         const composable = new CSetOracleData(buffer)
  //         console.log(composable)
  //       }
  //     }
  //   }
  // }

  async invalidate (block: RawBlock): Promise<void> {
    // const records: Record<string, OraclePrice> = {}
    // for (const oraclePrice of Object.values(records)) {
    //   this.mapper.delete(oraclePrice)
    // }
  }
}

// /**
//  * Composable SetOracleData, C stands for Composable.
//  * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
//  */
// export class CSetOracleData extends ComposableBuffer<SetOracleData> {
//   static OP_CODE = 0x79
//   static OP_NAME = 'OP_DEFI_TX_SET_ORACLE_DATA'
//
//   composers (ao: SetOracleData): BufferComposer[] {
//     return [
//       ComposableBuffer.hexBEBufferLE(32, () => ao.oracleId, v => ao.oracleId = v),
//       ComposableBuffer.bigNumberUInt64(() => ao.timestamp, v => ao.timestamp = v),
//       ComposableBuffer.varUIntArray(() => ao.tokenPrices, v => ao.tokenPrices = v, v => new CTokenPrice(v))
//     ]
//   }
// }
//
// export class CTokenPrice extends ComposableBuffer<TokenPrice> {
//   composers (sb: TokenPrice): BufferComposer[] {
//     return [
//       ComposableBuffer.varUIntUtf8BE(() => sb.token, v => sb.token = v),
//       ComposableBuffer.varUIntArray(() => sb.amount, v => sb.amount = v, v => new CTokenAmount(v))
//     ]
//   }
// }
//
// class CTokenAmount extends ComposableBuffer<TokenPrice> {
//   composers (tp: TokenPrice): BufferComposer[] {
//     return [
//       ComposableBuffer.varUIntUtf8BE(() => tp.token, v => tp.token = v),
//       ComposableBuffer.varUIntUtf8BE(() => tp.currency, v => tp.currency = v),
//       ComposableBuffer.satoshiAsBigNumber(() => tp.amount, v => tp.amount = v),
//       ComposableBuffer.satoshiAsBigNumber(() => tp.timestamp, v => tp.timestamp = v)
//     ]
//   }
// }
//
// interface TokenPrice {
//   token: string
//   currency: string
//   amount: BigNumber
//   timestamp: BigNumber
// }
