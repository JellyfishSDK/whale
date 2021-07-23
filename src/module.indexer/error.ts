export class IndexerError extends Error {
  constructor (message: string) {
    super(`module.indexer: ${message}`)
  }
}

/**
 * During module.sync lifecycle there are reliant on existing index data.
 * When the data cannot be found, it will result in NotFoundIndexerError crashing the syncing.
 */
export class NotFoundIndexerError extends IndexerError {
  constructor (action: 'invalidate' | 'index', type: string, id: string) {
    super(`attempting to sync:${action} but type:${type} with id:${id} cannot be found in the index`)
  }
}

/**
 * Result RpcNotFoundIndexerError during module.sync calling rpc
 */
export class RpcNotFoundIndexerError extends IndexerError {
  constructor (action: string, item = '') {
    super(`not found data from rpc ${action} ${item}`)
  }
}

/**
 * Result items.length validation on rpc READ
 */
export class RpcItemLengthError extends IndexerError {
  constructor (item: string) {
    super(`the ${item} length is not valid`)
  }
}
