import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { OracleController } from '@src/module.api/oracle.controller'
import { OracleState } from '@whale-api-client/api/oracle'
import BigNumber from 'bignumber.js'
import waitForExpect from 'wait-for-expect'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: OracleController

describe('1 - Oracle Weightage', () => {
  let oracleId: string
  let height: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    const priceFeeds = [{ token: 'AAPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    height = await container.call('getblockcount')
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get status 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getStatus(oracleId)
    expect(result?.data.weightage).toStrictEqual(2)
  })

  it('should return undefined if get status with invalid oracle id', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getStatus('invalid')
    expect(result).toStrictEqual(undefined)
  })
})

describe('2 - Oracle Price Feed', () => {
  let oracleId1: string
  let oracleId2: string
  let height: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [
      { token: 'TSLA', currency: 'USD' }
    ]

    await container.call('updateoracle', [oracleId1, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    await container.call('getblockcount')

    const priceFeeds3 = [
      { token: 'FB', currency: 'CNY' }
    ]

    oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds3, 1])

    await container.generate(1)

    const priceFeeds4 = [
      { token: 'MSFT', currency: 'SGD' }
    ]

    await container.call('updateoracle', [oracleId2, await container.getNewAddress(), priceFeeds4, 2])

    await container.generate(1)

    height = await container.call('getblockcount')
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get all price feeds 5 blocks after the last oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPriceFeeds() ?? []

    // Result sorted by token, currency and block height
    expect(result[0]?.data.token).toStrictEqual('AAPL')
    expect(result[0]?.data.currency).toStrictEqual('EUR')
    expect(result[0]?.state).toStrictEqual(OracleState.REMOVED)

    expect(result[1]?.data.token).toStrictEqual('FB')
    expect(result[1]?.data.currency).toStrictEqual('CNY')
    expect(result[1]?.state).toStrictEqual(OracleState.REMOVED)

    expect(result[2]?.data.token).toStrictEqual('MSFT')
    expect(result[2]?.data.currency).toStrictEqual('SGD')
    expect(result[2]?.state).toStrictEqual(OracleState.LIVE)

    expect(result[3]?.data.token).toStrictEqual('TSLA')
    expect(result[3]?.data.currency).toStrictEqual('USD')
    expect(result[3]?.state).toStrictEqual(OracleState.LIVE)
  })

  it('should get all price feeds with oracle id 5 blocks after the last oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result1 = await controller.getPriceFeed(oracleId1) ?? []

    expect(result1[0]?.data.token).toStrictEqual('AAPL')
    expect(result1[0]?.data.currency).toStrictEqual('EUR')
    expect(result1[0]?.state).toStrictEqual(OracleState.REMOVED)

    expect(result1[1]?.data.token).toStrictEqual('TSLA')
    expect(result1[1]?.data.currency).toStrictEqual('USD')
    expect(result1[1]?.state).toStrictEqual(OracleState.LIVE)

    const result2 = await controller.getPriceFeed(oracleId2) ?? []

    expect(result2[0]?.data.token).toStrictEqual('FB')
    expect(result2[0]?.data.currency).toStrictEqual('CNY')
    expect(result2[0]?.state).toStrictEqual(OracleState.REMOVED)

    expect(result2[1]?.data.token).toStrictEqual('MSFT')
    expect(result2[1]?.data.currency).toStrictEqual('SGD')
    expect(result2[1]?.state).toStrictEqual(OracleState.LIVE)
  })

  it('should return empty array if get price feeds with invalid oracle id', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPriceFeed('invalid')

    expect(result).toStrictEqual([])
  })
})

describe('3 - Oracle Price Data', () => {
  let oracleId: string
  let height: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' },
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height = await container.call('getblockcount')
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get all price data with oracle id 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPriceData(oracleId) ?? []
    expect(result.length).toStrictEqual(2)

    expect(result[0]?.data.token).toStrictEqual('AAPL')
    expect(result[0]?.data.currency).toStrictEqual('EUR')
    expect(result[0]?.data.amount).toStrictEqual('0.5')
    expect(result[0]?.state).toStrictEqual(OracleState.LIVE)

    expect(result[1]?.data.token).toStrictEqual('TSLA')
    expect(result[1]?.data.currency).toStrictEqual('USD')
    expect(result[1]?.data.amount).toStrictEqual('1')
    expect(result[1]?.state).toStrictEqual(OracleState.LIVE)
  })

  it('should return empty array if get price data with invalid oracle id', async () => {
    await waitForIndexedHeight(app, height)

    const result = await controller.getPriceData('invalid')

    expect(result).toStrictEqual([])
  })
})

describe('4 - Oracle Price', () => {
  let timestamp1: number
  let timestamp2: number
  let height1: number
  let height2: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    let stats = await container.call('getblockstats', [await container.call('getblockcount')])
    let timestamp = Number(stats.time)

    const prices1 = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' },
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')
    timestamp1 = Number((await container.call('getblockstats', [height1])).time)

    await container.generate(30)

    stats = await container.call('getblockstats', [await container.call('getblockcount')])
    timestamp = Number(stats.time)

    const prices2 = [
      { tokenAmount: '1.5@AAPL', currency: 'EUR' },
      { tokenAmount: '2.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
    timestamp2 = Number((await container.call('getblockstats', [height2])).time)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get latest price for token and currency 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height2 + 5)

    const result = await controller.getPrice('AAPL', 'EUR')

    expect(result?.data.token).toStrictEqual('AAPL')
    expect(result?.data.currency).toStrictEqual('EUR')
    expect(result?.data.amount).toStrictEqual(1.1666666666666667)
  })

  it('should return undefined if get latest price with invalid token and currency', async () => {
    await waitForIndexedHeight(app, height2 + 5)

    const result = await controller.getPrice('invalid', 'invalid')

    expect(result).toStrictEqual(undefined)
  })

  it('should get price for token and currency at specific timestamp', async () => {
    await waitForIndexedHeight(app, height2 + 5)

    const result1 = await controller.getPriceByTimestamp('AAPL', 'EUR', timestamp1)

    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount).toStrictEqual(0.5)

    const result2 = await controller.getPriceByTimestamp('AAPL', 'EUR', timestamp2)

    expect(result2?.data.token).toStrictEqual('AAPL')
    expect(result2?.data.currency).toStrictEqual('EUR')
    expect(result2?.data.amount).toStrictEqual(1.1666666666666667)
  })

  it('should return undefined if get latest price with invalid token, currency and timestamp', async () => {
    await waitForIndexedHeight(app, height2 + 5)

    const result = await controller.getPriceByTimestamp('invalid', 'invalid', -1)

    expect(result).toStrictEqual(undefined)
  })

  it('should get price percentage changed of two timestamps for token and currency', async () => {
    await waitForIndexedHeight(app, height2 + 5)

    const result = await controller.getPricePercentageChange('AAPL', 'EUR', timestamp1, timestamp2)

    expect(result).toStrictEqual(new BigNumber('0.006666666666666667'))
  })

  it('should return 0 if get latest price with invalid token, currency, timestamp1 and timestamp2', async () => {
    await waitForIndexedHeight(app, height2 + 5)

    const result = await controller.getPricePercentageChange('invalid', 'invalid', -1, -1)

    expect(result).toStrictEqual(new BigNumber('0'))
  })
})

describe('5 - Oracle Price with interval', () => {
  let timestamp: number
  let height: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const oracleId3 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 3])

    await container.generate(1)

    const oracleId4 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 4])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)
    // Oracle 1

    await waitForIndexedTimestamp(timestamp + 2)

    const price1 = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp + 2, price1])

    await waitForIndexedTimestamp(timestamp + 4)

    // Oracle 2

    const price2 = [
      { tokenAmount: '1.0@AAPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp + 4, price2])

    await waitForIndexedTimestamp(timestamp + 6)

    // Oracle 3

    const price3 = [
      { tokenAmount: '1.5@AAPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId3, timestamp + 6, price3])

    await waitForIndexedTimestamp(timestamp + 8)

    // Oracle 4

    const price4 = [
      { tokenAmount: '2.0@AAPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId4, timestamp + 8, price4])

    height = await container.call('getblockcount')
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  async function waitForIndexedTimestamp (timestamp: number, timeout: number = 30000): Promise<void> {
    await waitForExpect(async () => {
      await container.generate(1)
      const height = await container.call('getblockcount')
      const stats = await container.call('getblockstats', [height])
      await expect(Number(stats.time)).toStrictEqual(timestamp)
    }, timeout)
  }

  it('should get price interval', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPriceInterval('AAPL', 'EUR', timestamp + 2, timestamp + 8, 2)

    expect(result).toStrictEqual([
      { timestamp: timestamp + 2, amount: 0.5 },
      { timestamp: timestamp + 4, amount: 0.8333333333333334 },
      { timestamp: timestamp + 6, amount: 1.1666666666666667 },
      { timestamp: timestamp + 8, amount: 1.5 }
    ])
  })
})
