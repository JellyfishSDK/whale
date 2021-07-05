import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
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

describe('Price data - setoracledata 1', () => {
  let oracleId: string
  let timestamp: number
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    timestamp = new Date().getTime()
    const prices = [{ tokenAmount: '0.5@APPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  it('should get price data', async () => {
    await setup()
    await waitForHeight(app, height)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const data1 = await priceDataMapper.get(oracleId, 'APPL', 'EUR', height)

    expect(data1?.data.oracleId).toStrictEqual(oracleId)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.data.amount).toStrictEqual('0.5')
    expect(data1?.data.timestamp).toStrictEqual(timestamp)
    expect(data1?.state).toStrictEqual(OracleState.LIVE)

    const data2 = await container.call('listlatestrawprices', [{ token: 'APPL', currency: 'EUR' }])

    expect(data2[0]?.priceFeeds).toStrictEqual({ token: 'APPL', currency: 'EUR' })
    expect(data2[0]?.oracleid).toStrictEqual(oracleId)
    expect(data2[0]?.rawprice).toStrictEqual(0.5)
    expect(data2[0]?.timestamp).toStrictEqual(timestamp)
  })
})

describe('Price data - setoracledata 2', () => {
  let oracleId: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    timestamp = new Date().getTime()
    const prices1 = [{ tokenAmount: '0.5@APPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    const prices2 = [{ tokenAmount: '1.0@APPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId, timestamp, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get latest price data only if 2 prices data are set', async () => {
    await setup()
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const data1 = await priceDataMapper.get(oracleId, 'APPL', 'EUR', height1)

    expect(data1?.data.oracleId).toStrictEqual(oracleId)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.data.amount).toStrictEqual('0.5')
    expect(data1?.data.timestamp).toStrictEqual(timestamp)
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const data2 = await priceDataMapper.get(oracleId, 'APPL', 'EUR', height2)

    expect(data2?.data.oracleId).toStrictEqual(oracleId)
    expect(data2?.data.token).toStrictEqual('APPL')
    expect(data2?.data.currency).toStrictEqual('EUR')
    expect(data2?.data.amount).toStrictEqual('1')
    expect(data2?.data.timestamp).toStrictEqual(timestamp)
    expect(data2?.state).toStrictEqual(OracleState.LIVE)

    const data3 = await container.call('listlatestrawprices', [{ token: 'APPL', currency: 'EUR' }])

    expect(data3[0]?.priceFeeds).toStrictEqual({ token: 'APPL', currency: 'EUR' })
    expect(data3[0]?.oracleid).toStrictEqual(oracleId)
    expect(data3[0]?.rawprice).toStrictEqual(1)
    expect(data3[0]?.timestamp).toStrictEqual(timestamp)
  })
})

describe('Price data - updateoracle', () => {
  let oracleId: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    // Apoint an oracle
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    // Set price to AAPL/USD and TESL/USD price feeds of the oracle
    timestamp = new Date().getTime()

    const prices1 = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' },
      { tokenAmount: '1.0@TESL', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    // Remove TESL/USD price feed from the oracle
    const priceFeeds2 = [
      { token: 'APPL', currency: 'EUR' }
    ]

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get price data if updateoracle call remove 1 of the price feed', async () => {
    await setup()
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const data1 = await priceDataMapper.get(oracleId, 'APPL', 'EUR', height1)

    expect(data1?.data.oracleId).toStrictEqual(oracleId)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.data.amount).toStrictEqual('0.5')
    expect(data1?.data.timestamp).toStrictEqual(timestamp)
    expect(data1?.state).toStrictEqual(OracleState.LIVE)

    const data2 = await priceDataMapper.get(oracleId, 'TESL', 'USD', height1)

    expect(data2?.data.oracleId).toStrictEqual(oracleId)
    expect(data2?.data.token).toStrictEqual('TESL')
    expect(data2?.data.currency).toStrictEqual('USD')
    expect(data2?.data.amount).toStrictEqual('1')
    expect(data2?.data.timestamp).toStrictEqual(timestamp)
    expect(data2?.state).toStrictEqual(OracleState.REMOVED)

    const data3 = await container.call('listlatestrawprices', [{ token: 'APPL', currency: 'EUR' }])

    expect(data3[0]?.priceFeeds).toStrictEqual({ token: 'APPL', currency: 'EUR' })
    expect(data3[0]?.oracleid).toStrictEqual(oracleId)
    expect(data3[0]?.rawprice).toStrictEqual(0.5)
    expect(data3[0]?.timestamp).toStrictEqual(timestamp)
  })
})

describe('Price data - removeoracle', () => {
  let oracleId: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    // Apoint an oracle
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    // Set price to AAPL/USD and TESL/USD price feeds of the oracle
    timestamp = new Date().getTime()

    const prices1 = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' },
      { tokenAmount: '1.0@TESL', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    // Remove TESL/USD price feed from the oracle
    await container.call('removeoracle', [oracleId])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should not get price data if removeoracle call', async () => {
    await setup()
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const data1 = await priceDataMapper.get(oracleId, 'APPL', 'EUR', height1)

    expect(data1?.data.oracleId).toStrictEqual(oracleId)
    expect(data1?.data.token).toStrictEqual('APPL')
    expect(data1?.data.currency).toStrictEqual('EUR')
    expect(data1?.data.amount).toStrictEqual('0.5')
    expect(data1?.data.timestamp).toStrictEqual(timestamp)
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const data2 = await priceDataMapper.get(oracleId, 'TESL', 'USD', height1)

    expect(data2?.data.oracleId).toStrictEqual(oracleId)
    expect(data2?.data.token).toStrictEqual('TESL')
    expect(data2?.data.currency).toStrictEqual('USD')
    expect(data2?.data.amount).toStrictEqual('1')
    expect(data2?.data.timestamp).toStrictEqual(timestamp)
    expect(data2?.state).toStrictEqual(OracleState.REMOVED)

    const data3 = await container.call('listlatestrawprices', [{ token: 'APPL', currency: 'EUR' }])
    expect(data3.length).toStrictEqual(0)
  })
})
