import { RawBlock } from '@src/module.indexer/model/_abstract'
import { DeferableDftxMapper, DeferrableModel } from '@src/module.model/_deferrable'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { DfTxIndexer, DfTxTransaction } from './_abstract'

export abstract class DeferableIndexer<M extends DeferrableModel, T> extends DfTxIndexer<T> {
  abstract OP_CODE: number
  abstract mapDfTxToModel (txn: T, block: RawBlock): Promise<M>

  constructor (
    protected readonly deferableDfTxMapper: DeferableDftxMapper<M>
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, txns: DfTxTransaction<T>): Promise<void> {
    const deferableAction = await this.mapDfTxToModel(txns.dftx.data, block)
    const activateNow = deferableAction.activationHeight <= block.height

    if (activateNow) {
      await this.deferableDfTxMapper.getMapper().put(deferableAction)
    } else {
      const activationHeight = HexEncoder.encodeHeight(deferableAction.activationHeight)
      await this.deferableDfTxMapper.getDeferredMapper().put({
        id: `${deferableAction.uniqueKey}-${activationHeight}-${block.height}`,
        data: deferableAction,
        activated: false
      })
    }

    console.log('checking sn for: ', deferableAction.uniqueKey, block.height)
    const existed = await this.deferableDfTxMapper.getHistoryMapper().getCount(deferableAction.uniqueKey, block.height)
    const height = HexEncoder.encodeHeight(block.height)
    const sn = HexEncoder.encodeHeight(existed)
    const historyId = `${height}-${sn}-${deferableAction.uniqueKey}`
    console.log('writing with history id', historyId)
    await this.deferableDfTxMapper.getHistoryMapper().put({
      ...deferableAction,
      id: historyId
    })
  }

  async indexBlockStart (block: RawBlock): Promise<void> {
    const { height } = block
    const deferred = await this.deferableDfTxMapper.getDeferredMapper().query(false, height)

    if (deferred.length > 0) {
      // last one overwrite all (within same block)
      await this.deferableDfTxMapper.getMapper().put(deferred[deferred.length - 1].data)
      for (const d of deferred) {
        const { uniqueKey, activationHeight } = d.data
        // mark activated
        await this.deferableDfTxMapper.getDeferredMapper().put({
          id: `${uniqueKey}-${HexEncoder.encodeHeight(activationHeight)}-${block.height}`,
          data: d.data,
          activated: true
        })
      }
    }
  }

  async invalidateBlockEnd (block: RawBlock): Promise<void> {
    const { height } = block
    const deferred = await this.deferableDfTxMapper.getDeferredMapper().query(true, height)

    if (deferred.length > 0) {
      const previous = await this.deferableDfTxMapper.getLastActivated(deferred[0].data.uniqueKey, block.height)
      if (previous !== undefined) {
        await this.deferableDfTxMapper.getMapper().put(previous)
      } else {
        await this.deferableDfTxMapper.getMapper().delete(deferred[0].data.id)
      }

      for (const d of deferred) {
        const { uniqueKey, activationHeight } = d.data
        // undo activation
        await this.deferableDfTxMapper.getDeferredMapper().put({
          id: `${uniqueKey}-${HexEncoder.encodeHeight(activationHeight)}-${block.height}`,
          data: d.data,
          activated: false
        })
      }
    }
  }

  async invalidateTransaction (block: RawBlock, txns: DfTxTransaction<T>): Promise<void> {
    const deferableAction = await this.mapDfTxToModel(txns.dftx.data, block)
    const activateNow = deferableAction.activationHeight <= block.height

    if (activateNow) {
      await this.deferableDfTxMapper.getMapper().delete(deferableAction.id)
    } else {
      const { uniqueKey, activationHeight } = deferableAction
      const deferredActionId = `${uniqueKey}-${HexEncoder.encodeHeight(activationHeight)}`
      await this.deferableDfTxMapper.getDeferredMapper().delete(deferredActionId)
    }

    const existed = await this.deferableDfTxMapper.getHistoryMapper().getCount(deferableAction.uniqueKey, block.height)
    const height = HexEncoder.encodeHeight(block.height)
    const sn = HexEncoder.encodeHeight(existed - 1)
    const historyId = `${height}-${sn}-${deferableAction.uniqueKey}`
    await this.deferableDfTxMapper.getHistoryMapper().delete(historyId)
  }
}
