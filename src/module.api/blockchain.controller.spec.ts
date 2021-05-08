import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { wallet } from '@defichain/jellyfish-api-core'
import { BlockchainController } from '@src/module.api/blockchain.controller'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: BlockchainController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      load: [() => ({ network: 'regtest' })]
    })],
    controllers: [BlockchainController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()

  controller = app.get<BlockchainController>(BlockchainController)
})

describe('controller.getTransactions()', () => {
  let transactionId: string

  beforeAll(async () => {
    await client.wallet.setWalletFlag(wallet.WalletFlag.AVOID_REUSE)
    transactionId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)
  })

  it('should getRawMempool and return array of transaction ids', async () => {
    const data = await controller.getTransactions()

    expect(data.length).toBe(1)
    expect(data[0]).toBe(transactionId)
  })
})
