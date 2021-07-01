import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OraclePriceDataMapper } from '@src/module.model/oracle.priceData'

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

describe('PriceFeed - setOracleData', () => {
  let oracleId1: string
  let oracleId2: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [{ token: 'APPL', currency: 'EUR' }]

    oracleId1 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds1, { weightage: 1 })

    await container.generate(1)

    oracleId2 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds1, { weightage: 1 })

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000 - 3300)
    const timestamp2 = Math.floor(new Date().getTime() / 1000 + 3300)

    const prices1 = [{ tokenAmount: '0.5@APPL', currency: 'EUR' }]
    await client.oracle.setOracleData(oracleId1, timestamp1, { prices: prices1 })

    await container.generate(1)

    const prices2 = [{ tokenAmount: '1.0@APPL', currency: 'EUR' }]
    await client.oracle.setOracleData(oracleId2, timestamp2, { prices: prices2 })

    await container.generate(1)

    blockCount = await client.blockchain.getBlockCount()
  }

  it('Should set oracle data', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    let price = await priceDataMapper.get(`${oracleId1}-APPL-EUR`)
    expect(price?.data.oracleid).toStrictEqual(oracleId1)
    expect(price?.data.token).toStrictEqual('APPL')
    expect(price?.data.currency).toStrictEqual('EUR')
    expect(price?.data.amount).toStrictEqual('0.5')

    price = await priceDataMapper.get(`${oracleId2}-APPL-EUR`)
    expect(price?.data.oracleid).toStrictEqual(oracleId2)
    expect(price?.data.token).toStrictEqual('APPL')
    expect(price?.data.currency).toStrictEqual('EUR')
    expect(price?.data.amount).toStrictEqual('1')
  })
})
