import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CCreateVault, CreateVault } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScript } from '@defichain/jellyfish-address'
import { LoanVaultState, VaultMapper } from '@src/module.model/vault'

@Injectable()
export class CreateVaultIndexer extends DfTxIndexer<CreateVault> {
  OP_CODE: number = CCreateVault.OP_CODE
  private readonly logger = new Logger(CreateVaultIndexer.name)

  constructor (
    private readonly vaultMapper: VaultMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<CreateVault>): Promise<void> {
    const data = transaction.dftx.data
    const txn = transaction.txn

    await this.vaultMapper.put({
      id: txn.txid,
      ownerAddress: fromScript(data.ownerAddress, this.network)?.address ?? '',
      schemeId: data.schemeId,
      state: LoanVaultState.UNKNOWN, //! TODO: add default state
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CreateVault>): Promise<void> {
    const txn = transaction.txn
    await this.vaultMapper.delete(txn.txid)
  }
}
