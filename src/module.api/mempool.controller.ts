import { Controller, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MempoolTx } from '@defichain/jellyfish-api-core/dist/category/blockchain'
import { MempoolTxData } from '@whale-api-client/api/mempool'

@Controller('/v1/:network/mempool')
export class MempoolController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Returns all transaction ids in memory pool.
   * @return {Promise<string[]>} transaction ids
   */
  @Get('')
  async list (): Promise<string[]> {
    return await this.client.blockchain.getRawMempool(false)
  }

  /**
   * Get mempool info of a transaction with transaction id.
   *
   * @param {string} id
   * @return {Promise<MempoolTxData>}
   */
  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<MempoolTxData> {
    try {
      const data: MempoolTx = await this.client.blockchain.getRawMempool(true)
      return mapMempoolTxData(id, data)
    } catch (e) {
      throw new NotFoundException('Unable to find mempool transaction')
    }
  }
}

function mapMempoolTxData (id: string, mempoolTx: MempoolTx): MempoolTxData {
  return {
    vsize: mempoolTx[id].vsize,
    size: mempoolTx[id].size,
    weight: mempoolTx[id].weight,
    fee: mempoolTx[id].fee,
    modifiedfee: mempoolTx[id].modifiedfee,
    time: mempoolTx[id].time,
    height: mempoolTx[id].height,
    descendant: {
      count: mempoolTx[id].descendantcount,
      size: mempoolTx[id].descendantsize,
      fees: mempoolTx[id].descendantfees
    },
    ancestor: {
      count: mempoolTx[id].ancestorcount,
      size: mempoolTx[id].ancestorsize,
      fees: mempoolTx[id].ancestorfees
    },
    wtxid: mempoolTx[id].wtxid,
    fees: {
      base: mempoolTx[id].fees.base,
      modified: mempoolTx[id].fees.modified,
      ancestor: mempoolTx[id].fees.ancestor,
      descendant: mempoolTx[id].fees.descendant
    },
    depends: mempoolTx[id].depends,
    spentby: mempoolTx[id].spentby,
    'bip125-replaceable': mempoolTx[id]['bip125-replaceable']
  }
}
