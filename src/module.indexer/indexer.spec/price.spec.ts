import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let client: JsonRpcClient

beforeAll(async () => {
  try {
    await container.start()
    await container.waitForReady()
    await container.generate(20)
    await container.waitForWalletCoinbaseMaturity()

    app = await createIndexerTestModule(container)
    await app.init()

    client = new JsonRpcClient(await container.getCachedRpcUrl())
    await setup()
  } catch (e) {
    console.log(2211)
    console.log(e)
  }
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

  const oracleid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

  await container.generate(1)

  const timestamp = new Date().getTime()
  const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid, timestamp, { prices })

  await container.generate(1)

  await client.oracle.setOracleData(oracleid, timestamp, { prices })

  console.log(oracleid)

  const data = await client.oracle.getOracleData(oracleid)
  console.log(data)
}

describe('x', () => {
  it('should wait for block height 0', async () => {
    await waitForHeight(app, 0)
  })
})
