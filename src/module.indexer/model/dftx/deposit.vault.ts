import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { DepositToVault, CDepositToVault } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { VaultMapper } from '@src/module.model/vault'
import { VaultHistoryEvent, VaultHistoryMapper, VaultHistory } from '@src/module.model/vault.history'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { TokenMapper } from '@src/module.model/token'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'

@Injectable()
export class DepositToVaultIndexer extends DfTxIndexer<DepositToVault> {
  OP_CODE: number = CDepositToVault.OP_CODE
  private readonly logger = new Logger(DepositToVaultIndexer.name)

  constructor (
    private readonly vaultMapper: VaultMapper,
    private readonly vaultHistoryMapper: VaultHistoryMapper,
    private readonly tokenMapper: TokenMapper,
    private readonly priceTickerMapper: PriceTickerMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<DepositToVault>): Promise<void> {
    const data = transaction.dftx.data

    const vault = await this.vaultMapper.get(data.vaultId)
    if (vault === undefined) {
      throw new NotFoundIndexerError('index', 'DepositToVault', data.vaultId)
    }

    const token = await this.tokenMapper.get(`${data.tokenAmount.token}`)
    if (token === undefined) {
      throw new NotFoundIndexerError('index', 'DepositToVault', `${data.tokenAmount.token}`)
    }

    const collateralAmounts: Array<{token: string, currency: string}> = vault.collateralAmounts
    const index = collateralAmounts.findIndex(amt => amt.currency === token.symbol)
    if (index !== -1) {
      const sum = new BigNumber(collateralAmounts[index].token).plus(data.tokenAmount.amount)
      collateralAmounts.splice(index, 1, { token: sum.toString(), currency: token.symbol })
    } else {
      collateralAmounts.push({ token: data.tokenAmount.amount.toString(), currency: token.symbol })
    }

    let collateralValue = new BigNumber(0)
    for (const amt of collateralAmounts) {
      const price = await this.priceTickerMapper.get(`${amt.currency}-USD`)
      if (price === undefined) {
        throw new NotFoundIndexerError('index', 'DepositToVault', `${amt.currency}-USD`)
      }
      collateralValue = collateralValue.plus(new BigNumber(amt.token).times(price.price.aggregated.amount))
    }

    const informativeRatio = vault.loanValue === '0' ? new BigNumber('-1') : collateralValue.div(vault.loanValue).times(100)
    const collateralRatio = parseInt(informativeRatio.toFixed(0))

    const metadata = {
      ...vault,
      id: data.vaultId,
      sort: HexEncoder.encodeHeight(block.height),
      collateralAmounts: collateralAmounts,
      collateralValue: collateralValue.toString(),
      informativeRatio: informativeRatio.toString(),
      collateralRatio: collateralRatio,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    }

    await this.vaultMapper.put(metadata)

    await this.vaultHistoryMapper.put({
      ...metadata,
      id: `${data.vaultId}-${block.height}`,
      vaultId: data.vaultId,
      event: VaultHistoryEvent.DEPOSIT,
      from: toBuffer(data.from.stack).toString('hex')
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<DepositToVault>): Promise<void> {
    const data = transaction.dftx.data

    const previous = await this.getPrevious(data.vaultId, block.height)
    if (previous === undefined) {
      throw new NotFoundIndexerError('index', 'DepositToVault', data.vaultId)
    }
  }

  /**
   * Get previous vault info
   */
  private async getPrevious (id: string, height: number): Promise<VaultHistory | undefined> {
    const findInNextPage = async (height: number): Promise<VaultHistory | undefined> => {
      const list = await this.vaultHistoryMapper.query(id, 100, HexEncoder.encodeHeight(height))
      if (list.length === 0) {
        return undefined
      }

      const previous = list.find(each => each.event === VaultHistoryEvent.DEPOSIT)
      if (previous !== undefined) {
        return previous
      }

      return await findInNextPage(list[list.length - 1].block.height)
    }
    return await findInNextPage(height)
  }
}
