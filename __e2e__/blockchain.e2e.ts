import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { wallet } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  app = await createTestingApp(container)
  client = app.get(JsonRpcClient)
})

afterAll(async () => {
  await container.stop()
})

describe('GET: /v1/regtest/mempooltransactions', () => {
  let transactionId: string

  beforeAll(async () => {
    await client.wallet.setWalletFlag(wallet.WalletFlag.AVOID_REUSE)
    transactionId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)
  })

  it('should getRawMempool and return array of transaction ids', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/mempool/transactions'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.length).toBe(1)
    expect(data[0]).toBe(transactionId)
  })
})
