import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'

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
  await container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

describe('PriceAggregration - setOracleData', () => {
  let oracleId1: string
  let oracleId2: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [{ token: 'APPL', currency: 'EUR' }]
    oracleId1 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds1, { weightage: 1 })

    await container.generate(1)

    oracleId2 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds1, { weightage: 1 })

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    const prices1 = [{ tokenAmount: '0.5@APPL', currency: 'EUR' }]
    await client.oracle.setOracleData(oracleId1, timestamp1, { prices: prices1 })

    await container.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000 - 200)
    const prices2 = [{ tokenAmount: '1.0@APPL', currency: 'EUR' }]
    await client.oracle.setOracleData(oracleId2, timestamp2, { prices: prices2 })

    await container.generate(1)

    blockCount = await client.blockchain.getBlockCount()
  }

  it('Should get oracle aggregration price data', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const priceAggregration = await priceAggregrationMapper.get(`${blockCount}-APPL-EUR`)

    expect(priceAggregration?.data.token).toStrictEqual('APPL')
    expect(priceAggregration?.data.currency).toStrictEqual('EUR')
    expect(priceAggregration?.data.currency).toStrictEqual(0.75)
  })
})
