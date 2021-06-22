import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)
  await container.waitForWalletCoinbaseMaturity()

  app = await createIndexerTestModule(container)
  await app.init()

  // client = new JsonRpcClient(await container.getCachedRpcUrl())
  await setup()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

async function setup (): Promise<void> {
  const priceFeeds = [
    { token: 'APPLE', currency: 'EUR' }
  ]

  const oracleid = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

  await container.generate(1)

  // Update oracle
  const updateOraclePriceFeeds = [
    { token: 'FB', currency: 'CNY' }
  ]

  await container.call('updateoracle', [oracleid, await container.getNewAddress(), updateOraclePriceFeeds, 2])

  await container.generate(1)

  const timestamp = new Date().getTime()
  const prices = [{ tokenAmount: '0.5@FB', currency: 'CNY' }]
  await container.call('setoracledata', [oracleid, timestamp, prices])

  await container.generate(1)
}

describe('x', () => {
  it('should wait for block height 0', async () => {
    await waitForHeight(app, 0)
  })
})
