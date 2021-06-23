import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()

  client = new JsonRpcClient(await container.getCachedRpcUrl())
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
  await container.waitForWalletCoinbaseMaturity()

  const priceFeeds = [
    { token: 'APPLE', currency: 'EUR' }
  ]

  const oracleid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

  // await container.generate(1)
  //
  // // Update oracle
  // const updateOraclePriceFeeds = [
  //   { token: 'FB', currency: 'CNY' },
  // ]
  //
  // await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
  //   priceFeeds: updateOraclePriceFeeds,
  //   weightage: 2
  // })

  await container.generate(1)

  const timestamp = new Date().getTime()
  const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid, timestamp, { prices })

  await container.generate(1)
}

describe('x', () => {
  it('should wait for block height 0', async () => {
    await waitForHeight(app, 0)
  })
})
