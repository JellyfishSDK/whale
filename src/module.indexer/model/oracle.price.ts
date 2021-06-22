import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'

@Injectable()
export class OraclePriceIndexer extends Indexer {
  // constructor (
  //   //private readonly mapper: OraclePriceMapper,
  // ) {
  //   super()
  // }

  // async index (block: RawBlock): Promise<void> {
  // const records: Record<string, OraclePrice> = {}

  //   for (const txn of block.tx) {
  //     try {
  //       if (txn.hex.includes('6a414466547879')) {
  //         const buffer = SmartBuffer.fromBuffer(Buffer.from('5fe2c6c2e00f7c764d0386945fa61dccf01374b5d819efad5e9911c9f82fc60cefa369327a01000001055445534c41010355534400a3e11100000000', 'hex'))
  //         const composable: any = new CSetOracleData(buffer)
  //         console.log(JellyfishJSON.stringify(composable))
  //       }
  //     } catch (e) {
  //       console.log(e)
  //     }
  //   }
  // }

  async index (block: RawBlock): Promise<void> {
    // for (const txn of block.tx) {
    //   for (const vout of txn.vout) {

    // setoracledata
    // if(vout.scriptPubKey.hex.startsWith('6a414466547879')){
    //   const data = vout.scriptPubKey.hex.replace('6a414466547879','')
    //   const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    //   const composable = new CSetOracleData(buffer)
    //   const x = JellyfishJSON.stringify(composable)
    //   console.log('setoracledata')
    //   console.log(x)
    // }

    // appointoracle
    // if(vout.scriptPubKey.hex.includes('6a35446654786f')){
    //   console.log(vout.scriptPubKey.hex)
    //   // const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    //   // const composable = new CAppointOracle(buffer)
    //   // const x = JellyfishJSON.stringify(composable)
    //   // console.log('appointoracle')
    //   // console.log(x)
    // }

    // updateoracle
    // if(vout.scriptPubKey.hex.includes('6a4c5f4466547874')){
    //   console.log(vout.scriptPubKey.hex)
    //   // const buffer = SmartBuffer.fromBuffer(Buffer.from(data, 'hex'))
    //   // const composable = new CAppointOracle(buffer)
    //   // const x = JellyfishJSON.stringify(composable)
    //   // console.log('appointoracle')
    //   // console.log(x)
    // }

    // const x = vout.scriptPubKey.hex
    //
    // if(x.length > 120) {
    //   console.log(x)
    // }

    // console.log(vout.scriptPubKey.hex)
    //   }
    // }
  }

  async invalidate (block: RawBlock): Promise<void> {
    // const records: Record<string, OraclePrice> = {}
    // for (const oraclePrice of Object.values(records)) {
    //   this.mapper.delete(oraclePrice)
    // }
  }
}
