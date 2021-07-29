import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx.indexer'
import { CRemoveOracle, RemoveOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { OracleMapper } from '@src/module.model/oracle'
import { OracleHistory, OracleHistoryMapper } from '@src/module.model/oracle.history'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class RemoveOracleIndexer extends DfTxIndexer<RemoveOracle> {
  OP_CODE: number = CRemoveOracle.OP_CODE

  constructor (
    private readonly oracleMapper: OracleMapper,
    private readonly oracleHistoryMapper: OracleHistoryMapper,
    private readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<RemoveOracle>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const previous = await this.getPrevious(data.oracleId)

      await this.oracleMapper.delete(data.oracleId)
      for (const { token, currency } of previous.priceFeeds) {
        await this.oracleTokenCurrencyMapper.delete(`${token}-${currency}-${data.oracleId}`)
      }
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<RemoveOracle>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const previous = await this.getPrevious(data.oracleId)

      await this.oracleMapper.put({
        id: previous.oracleId,
        weightage: previous.weightage,
        priceFeeds: previous.priceFeeds,
        block: previous.block
      })

      for (const { token, currency } of previous.priceFeeds) {
        await this.oracleTokenCurrencyMapper.put({
          id: `${token}-${currency}-${previous.oracleId}`,
          key: `${token}-${currency}`,
          token: token,
          currency: currency,
          oracleId: previous.oracleId,
          weightage: previous.weightage,
          block: previous.block
        })
      }
    }
  }

  /**
   * history not deleted or updated
   */
  private async getPrevious (oracleId: string): Promise<OracleHistory> {
    const histories = await this.oracleHistoryMapper.query(oracleId, 1)
    if (histories.length === 0) {
      throw new NotFoundIndexerError('index', 'OracleHistory', oracleId)
    }

    return histories[0]
  }
}
