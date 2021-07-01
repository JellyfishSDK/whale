import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OraclePriceFeedMapper, OraclePriceFeedStatus } from '@src/module.model/oracle.priceFeed'

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

afterEach(async () => {
  const data = await container.call('listoracles')

  for (let i = 0; i < data.length; i += 1) {
    await container.call('removeoracle', [data[i]])
  }

  await container.generate(1)
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

describe('PriceFeed - approveOracle', () => {
  let oracleId: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)
    blockCount = await client.blockchain.getBlockCount()
  }

  it('should get priceFeed', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const priceFeedMapper = app.get(OraclePriceFeedMapper)

    const priceFeed1 = await priceFeedMapper.get(`${oracleId}-APPL-EUR`)
    expect(priceFeed1?.data.token).toStrictEqual('APPL')
    expect(priceFeed1?.data.currency).toStrictEqual('EUR')
    expect(priceFeed1?.state).toStrictEqual(OraclePriceFeedStatus.LIVE)

    const priceFeed2 = await priceFeedMapper.get(`${oracleId}-APPL-EUR`)
    expect(priceFeed2?.data.token).toStrictEqual('APPL')
    expect(priceFeed2?.data.currency).toStrictEqual('EUR')
    expect(priceFeed2?.state).toStrictEqual(OraclePriceFeedStatus.LIVE)
  })
})

describe('PriceFeed - updateOracle', () => {
  let oracleId: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]
    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds1, { weightage: 1 })

    await container.generate(1)

    const priceFeeds2 = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: priceFeeds2,
      weightage: 2
    })

    await container.generate(1)

    blockCount = await client.blockchain.getBlockCount()
  }

  it('should get priceFeed', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const priceFeedMapper = app.get(OraclePriceFeedMapper)

    const priceFeed1 = await priceFeedMapper.get(`${oracleId}-APPL-EUR`)
    expect(priceFeed1?.data.token).toStrictEqual('APPL')
    expect(priceFeed1?.data.currency).toStrictEqual('EUR')
    expect(priceFeed1?.state).toStrictEqual(OraclePriceFeedStatus.REMOVED)

    const priceFeed2 = await priceFeedMapper.get(`${oracleId}-TESL-USD`)
    expect(priceFeed2?.data.token).toStrictEqual('TESL')
    expect(priceFeed2?.data.currency).toStrictEqual('USD')
    expect(priceFeed2?.state).toStrictEqual(OraclePriceFeedStatus.REMOVED)

    const priceFeed3 = await priceFeedMapper.get(`${oracleId}-FB-CNY`)
    expect(priceFeed3?.data.token).toStrictEqual('FB')
    expect(priceFeed3?.data.currency).toStrictEqual('CNY')
    expect(priceFeed3?.state).toStrictEqual(OraclePriceFeedStatus.LIVE)

    const priceFeed4 = await priceFeedMapper.get(`${oracleId}-MSFT-SGD`)
    expect(priceFeed4?.data.token).toStrictEqual('MSFT')
    expect(priceFeed4?.data.currency).toStrictEqual('SGD')
    expect(priceFeed4?.state).toStrictEqual(OraclePriceFeedStatus.LIVE)
  })
})

describe('PriceFeed - removeOracle', () => {
  let oracleId: string
  let blockcount: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    await client.oracle.removeOracle(oracleId)

    await container.generate(1)

    blockcount = await client.blockchain.getBlockCount()
  }

  it('should remove priceFeed', async () => {
    await setup()
    await waitForHeight(app, blockcount)

    const priceFeedMapper = app.get(OraclePriceFeedMapper)

    const priceFeed1 = await priceFeedMapper.get(`${oracleId}-APPL-EUR`)
    expect(priceFeed1?.data.token).toStrictEqual('APPL')
    expect(priceFeed1?.data.currency).toStrictEqual('EUR')
    expect(priceFeed1?.state).toStrictEqual(OraclePriceFeedStatus.REMOVED)

    const priceFeed2 = await priceFeedMapper.get(`${oracleId}-TESL-USD`)
    expect(priceFeed2?.data.token).toStrictEqual('TESL')
    expect(priceFeed2?.data.currency).toStrictEqual('USD')
    expect(priceFeed2?.state).toStrictEqual(OraclePriceFeedStatus.REMOVED)
  })
})
