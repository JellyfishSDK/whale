import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { DepositToVault, CDepositToVault } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { VaultDepositMapper } from '@src/module.model/vault.deposit'
// import { HexEncoder } from '@src/module.model/_hex.encoder'
// import { IndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'
// import { NetworkName } from '@defichain/jellyfish-network'
// import { P2PKH, P2WPKH } from '@defichain/jellyfish-address'
import { Token, TokenMapper } from '@src/module.model/token'

@Injectable()
export class DepositToVaultIndexer extends DfTxIndexer<DepositToVault> {
  OP_CODE: number = CDepositToVault.OP_CODE
  private readonly logger = new Logger(DepositToVaultIndexer.name)

  constructor (
    private readonly vaultDepositMapper: VaultDepositMapper,
    private readonly tokenMapper: TokenMapper
    // @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<DepositToVault>): Promise<void> {
    const data = transaction.dftx.data
    console.log('data: ', data)

    const token = await this.tokenMapper.get(data.tokenAmount.token.toString()) as Token

    // const ownerAddress = P2PKH.to(this.network, data.from).utf8String
    await this.vaultDepositMapper.put({
      id: `${data.vaultId}-${block.height}`,
      vaultId: data.vaultId,
      ownerAddress: 'addr',
      tokenAmount: new BigNumber(1010),
      symbol: token.symbol,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    })
  }

  async invalidateTransaction (block: RawBlock, txn: DfTxTransaction<DepositToVault>): Promise<void> {
    // const data = transaction.dftx.data
    // for (const { dftx: { data } } of txns) {
    // const tokenId = await this.tokenMapper.getNextTokenID(true)
    // await this.poolPairMapper.delete(`${tokenId - 1}-${block.height}`)
    // await this.poolPairTokenMapper.delete(`${data.tokenA}-${data.tokenB}-${tokenId - 1}`)
    // await this.tokenMapper.delete(`${tokenId - 1}`)
    // }
  }
}
