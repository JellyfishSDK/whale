import { RawBlock } from '@src/module.indexer/model/_abstract'
import { TransactionVout, TransactionVoutMapper } from '@src/module.model/transaction.vout'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { Injectable } from '@nestjs/common'
import { isNil } from 'lodash'

@Injectable()
export class VoutFinder {
  constructor (private readonly voutMapper: TransactionVoutMapper) {
  }

  async findVout (block: RawBlock, txid: string, n: number): Promise<TransactionVout | undefined> {
    const txn = block.tx.find(tx => tx.txid === txid)
    const vout = txn?.vout.find(vout => vout.n === n)
    if (!isNil(txn) && !isNil(vout)) {
      return {
        id: txn.txid + HexEncoder.encodeVoutIndex(n),
        txid: txn.txid,
        n: vout.n,
        value: vout.value.toFixed(8),
        tokenId: vout.tokenId,
        script: {
          type: vout.scriptPubKey.type,
          hex: vout.scriptPubKey.hex
        }
      }
    }
    return await this.voutMapper.get(txid, n)
  }
}
