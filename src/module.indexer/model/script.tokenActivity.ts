import { Transaction } from '@defichain/jellyfish-api-core/dist/category/blockchain'
import { CUtxosToAccount, ScriptBalances, UtxosToAccount } from '@defichain/jellyfish-transaction/dist'
import { Injectable } from '@nestjs/common'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { ScriptActivity, ScriptActivityMapper } from '@src/module.model/script.activity'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityIndexer } from './script.activity'
import { bufferToDfTx } from './_lib'

@Injectable()
export class ScriptTokenActivityIndexer extends ScriptActivityIndexer {
  async index (block: RawBlock): Promise<void> {
    for (let i = 0; i < block.tx.length; i++) {
      const txn = block.tx[i]
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        const decodedDfTx = bufferToDfTx(vout.scriptPubKey.hex)

        const activities: ScriptActivity[] = []
        if (decodedDfTx.isDfTx && decodedDfTx.type === CUtxosToAccount.OP_CODE) { // this indexer concern only
          this.mapUtxosToAccounts(block, decodedDfTx.object as UtxosToAccount, txn, i).forEach(tokenAct => activities.push(tokenAct))
        }
        // TODO: other DfTx type

        for (const activity of activities) {
          await this.mapper.put(activity)
        }
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    // TODO
  }

  mapUtxosToAccounts (block: RawBlock, utxosToAccount: UtxosToAccount, txn: Transaction, n: number): ScriptActivity[] {
    const vout = txn.vout[n]
    const single = (sb: ScriptBalances): ScriptActivity => ({
      id: super.mapId(block, 'vout', txn.txid, n),
      hid: HexEncoder.asSHA256(vout.scriptPubKey.hex),
      type: 'vout', // TODO: give unique name/hex
      typeHex: ScriptActivityMapper.typeAsHex('vout'),
      txid: txn.txid,
      block: {
        hash: block.hash,
        height: block.height
      },
      script: {
        type: vout.scriptPubKey.type,
        hex: vout.scriptPubKey.hex
      },
      vout: {
        txid: txn.txid,
        n: vout.n
      },
      value: vout.value.toFixed(8),
      tokenId: vout.tokenId
    })

    // const records: Record<string, ScriptActivity> = {} // TODO: may or may not (TBD) have to combine activity for same hid
    return utxosToAccount.to.map(sb => single(sb))
  }
}
