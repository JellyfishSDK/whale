import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OracleState } from '@whale-api-client/api/oracle'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()

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
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  it('should get priceFeed', async () => {
    await setup()
    await waitForHeight(app, height)

    const priceFeedMapper = app.get(OraclePriceFeedMapper)

    const data1 = await priceFeedMapper.get(oracleId, 'APPL', 'EUR', height)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.state).toStrictEqual(OracleState.LIVE)

    const data2 = await priceFeedMapper.get(oracleId, 'APPL', 'EUR', height)
    expect(data2?.data.token).toStrictEqual('APPL')
    expect(data2?.data.currency).toStrictEqual('EUR')
    expect(data2?.state).toStrictEqual(OracleState.LIVE)
  })
})

describe('PriceFeed - updateOracle', () => {
  let oracleId: string
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    const priceFeeds2 = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get priceFeed', async () => {
    await setup()
    await waitForHeight(app, height2)

    const priceFeedMapper = app.get(OraclePriceFeedMapper)

    const data1 = await priceFeedMapper.get(oracleId, 'APPL', 'EUR', height1)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const data2 = await priceFeedMapper.get(oracleId, 'TESL', 'USD', height1)
    expect(data2?.data.token).toStrictEqual('TESL')
    expect(data2?.data.currency).toStrictEqual('USD')
    expect(data2?.state).toStrictEqual(OracleState.REMOVED)

    const data3 = await priceFeedMapper.get(oracleId, 'FB', 'CNY', height2)
    expect(data3?.data.token).toStrictEqual('FB')
    expect(data3?.data.currency).toStrictEqual('CNY')
    expect(data3?.state).toStrictEqual(OracleState.LIVE)

    const data4 = await priceFeedMapper.get(oracleId, 'MSFT', 'SGD', height2)
    expect(data4?.data.token).toStrictEqual('MSFT')
    expect(data4?.data.currency).toStrictEqual('SGD')
    expect(data4?.state).toStrictEqual(OracleState.LIVE)
  })
})

describe('PriceFeed - removeOracle', () => {
  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')

    await container.call('removeoracle', [oracleId])

    await container.generate(1)
  }

  it('should remove priceFeed', async () => {
    await setup()
    await waitForHeight(app, height)

    const priceFeedMapper = app.get(OraclePriceFeedMapper)

    const data1 = await priceFeedMapper.get(oracleId, 'APPL', 'EUR', height)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const data2 = await priceFeedMapper.get(oracleId, 'TESL', 'USD', height)
    expect(data2?.data.token).toStrictEqual('TESL')
    expect(data2?.data.currency).toStrictEqual('USD')
    expect(data2?.state).toStrictEqual(OracleState.REMOVED)
  })
})
