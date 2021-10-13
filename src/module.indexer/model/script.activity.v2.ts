import { OP_DEFI_TX, OPCode } from '@defichain/jellyfish-transaction'
import { defid, Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import { Injectable, Logger } from '@nestjs/common'
import { DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { TokenActivityIndexer } from './script.activity.v2/token.activity/_abstract'
import { VoutFinder } from './_vout_finder'
import { NotFoundIndexerError } from '../error'
import { ScriptActivityV2, ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { TransactionVout } from '@whale-api-client/api/transactions'
import { mapId } from './script.activity.v2/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { UtxosToAccountIndexer } from './script.activity.v2/token.activity/account/utxos.to.account'
import { AccountToUtxosIndexer } from './script.activity.v2/token.activity/account/account.to.utxos'
import { AccountToAccountIndexer } from './script.activity.v2/token.activity/account/account.to.account'
import { AnyAccountToAccountIndexer } from './script.activity.v2/token.activity/account/any.account.to.account'
import { PoolSwapIndexer } from './script.activity.v2/token.activity/dex/poolswap'
import { AddLiquidityIndexer } from './script.activity.v2/token.activity/dex/add.liquidity'
import { RemoveLiquidityIndexer } from './script.activity.v2/token.activity/dex/remove.liquidity'

@Injectable()
export class ScriptActivityV2Indexer extends Indexer {
  private readonly logger = new Logger(ScriptActivityV2Indexer.name)
  private readonly indexers: Array<TokenActivityIndexer<any>>

  constructor (
    private readonly mapper: ScriptActivityV2Mapper,
    private readonly voutFinder: VoutFinder
  ) {
    super()
    this.indexers = [
      new UtxosToAccountIndexer(mapper),
      new AccountToUtxosIndexer(mapper),
      new AccountToAccountIndexer(mapper),
      new AnyAccountToAccountIndexer(mapper),
      new PoolSwapIndexer(mapper),
      new AddLiquidityIndexer(mapper),
      new RemoveLiquidityIndexer(mapper)
    ]
  }

  async index (block: RawBlock): Promise<void> {
    // utxos: inherited from v1
    for (const txn of block.tx) {
      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined) {
          continue
        }

        const vout = await this.voutFinder.findVout(block, vin.txid, vin.vout)
        if (vout === undefined) {
          throw new NotFoundIndexerError('index', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
        }
        await this.mapper.put(this.mapVin(block, txn, vin, vout))
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }
        await this.mapper.put(this.mapVout(block, txn, vout))
      }
    }

    // dftx
    const transactions = this.getDfTxTransactions(block)
    for (const indexer of this.indexers) {
      const filtered = transactions.filter(value => value.dftx.type === indexer.OP_CODE)
      await indexer.index(block, filtered)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    // utxos: inherited from v1
    for (const txn of block.tx) {
      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined) {
          continue
        }

        await this.mapper.delete(mapId(block, txn.txid, 'vin', vin.vout))
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }
        await this.mapper.delete(mapId(block, txn.txid, 'vout', vout.n))
      }
    }

    // dftx
    const transactions = this.getDfTxTransactions(block)
    for (const indexer of this.indexers) {
      const filtered = transactions.filter(value => value.dftx.type === indexer.OP_CODE)
      await indexer.invalidate(block, filtered)
    }
  }

  mapVin (block: RawBlock, txn: defid.Transaction, vin: defid.Vin, vout: TransactionVout): ScriptActivityV2 {
    return {
      id: mapId(block, txn.txid, 'vin', vin.vout),
      hid: HexEncoder.asSHA256(vout.script.hex),
      txid: txn.txid,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      script: {
        type: vout.script.type,
        hex: vout.script.hex
      },

      value: vout.value,
      tokenId: vout.tokenId ?? 0,

      category: 'utxo',
      utxo: {
        type: 'vin',
        txid: vin.txid,
        n: vin.vout
      }
    }
  }

  mapVout (block: RawBlock, txn: defid.Transaction, vout: defid.Vout): ScriptActivityV2 {
    return {
      id: mapId(block, txn.txid, 'vout', vout.n),
      hid: HexEncoder.asSHA256(vout.scriptPubKey.hex),
      txid: txn.txid,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      script: {
        type: vout.scriptPubKey.type,
        hex: vout.scriptPubKey.hex
      },
      value: vout.value.toFixed(8),
      tokenId: vout.tokenId,

      category: 'utxo',
      utxo: {
        type: 'vin',
        txid: txn.txid,
        n: vout.n
      }
    }
  }

  // TODO(@ivan-zynesis): refactor to remove duplication from MainDfTxIndexer
  private getDfTxTransactions (block: RawBlock): Array<DfTxTransaction<any>> {
    const transactions: Array<DfTxTransaction<any>> = []

    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
          continue
        }

        try {
          const stack: OPCode[] = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex')))
          if (stack[1].type !== 'OP_DEFI_TX') {
            continue
          }
          transactions.push({ txn: txn, dftx: (stack[1] as OP_DEFI_TX).tx })
        } catch (err) {
          // TODO(fuxingloh): we can improve on this design by having separated indexing pipeline where
          //  a failed pipeline won't affect another indexer pipeline.
          this.logger.error(`Failed to parse a DfTx Transaction with txid: ${txn.txid}`, err)
        }
      }
    }

    return transactions
  }
}
