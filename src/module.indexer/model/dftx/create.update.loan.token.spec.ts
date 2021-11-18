import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createToken, getNewAddress } from '@defichain/testing'
import { TokenMapper } from '@src/module.model/token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  await client.oracle.appointOracle(await container.getNewAddress(), [{
    token: 'AAPL',
    currency: 'EUR'
  }], { weightage: 1 })
  await client.oracle.appointOracle(await container.getNewAddress(), [{
    token: 'AMZN',
    currency: 'USD'
  }], { weightage: 1 })
  await container.generate(1)

  const height = await container.getBlockCount()
  // await waitForIndexedHeight(app, height - 1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('create loan token', () => {
  it('should index tokens', async () => {
  })
})
