import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight, waitForIndexedTimestamp } from '@src/e2e.module'
import { OracleController } from '@src/module.api/oracle.controller'
import BigNumber from 'bignumber.js'

describe('1 - Oracle Token Currency', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: OracleController

  let oracleId1: string
  let oracleId2: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    await setup()
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  async function setup (): Promise<void> {
    const priceFeeds1 = [{ token: 'AAPL', currency: 'EUR' }]

    oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [{ token: 'TSLA', currency: 'USD' }]

    await container.call('updateoracle', [oracleId1, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    const priceFeeds3 = [{ token: 'FB', currency: 'CNY' }]

    oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds3, 3])

    await container.generate(1)

    const priceFeeds4 = [{ token: 'MSFT', currency: 'SGD' }]

    await container.call('updateoracle', [oracleId2, await container.getNewAddress(), priceFeeds4, 4])

    await container.generate(1)
    const height: number = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  describe('listTokenCurrencies()', () => {
    it('should list token currencies with pagination', async () => {
      // Result sorted by token currency
      const first = await controller.listTokenCurrencies({ size: 2 }) ?? []

      expect(first.data.length).toStrictEqual(2)
      expect(first.page?.next).toStrictEqual('FB-CNY')

      expect(first.data[0].token).toStrictEqual('AAPL')
      expect(first.data[0].currency).toStrictEqual('EUR')

      expect(first.data[1].token).toStrictEqual('FB')
      expect(first.data[1].currency).toStrictEqual('CNY')

      const next = await controller.listTokenCurrencies({
        size: 2,
        next: first.page?.next
      })

      expect(next.data.length).toStrictEqual(2)
      expect(next.page?.next).toStrictEqual('TSLA-USD')

      expect(next.data[0].token).toStrictEqual('MSFT')
      expect(next.data[0].currency).toStrictEqual('SGD')

      expect(next.data[1].token).toStrictEqual('TSLA')
      expect(next.data[1].currency).toStrictEqual('USD')

      const last = await controller.listTokenCurrencies({
        size: 2,
        next: next.page?.next
      })

      expect(last.data.length).toStrictEqual(0)
      expect(last.page).toBeUndefined()
    })

    it('should return an empty array if list token currencies with size 100 next BAIDU-MYR which is out of range', async () => {
      const result = await controller.listTokenCurrencies({ size: 100, next: 'BAIDU-MYR' })
      expect(result.data.length).toStrictEqual(0)
      expect(result.page).toBeUndefined()
    })
  })

  describe('getTokenCurrencies()', () => {
    it('should get all token currencies with oracle id with pagination', async () => {
      // oracleId1
      let first = await controller.getTokenCurrencies(oracleId1, { size: 1 })

      expect(first.data.length).toStrictEqual(1)
      expect(first.page?.next).toStrictEqual('AAPL-EUR')

      expect(first.data[0].token).toStrictEqual('AAPL')
      expect(first.data[0].currency).toStrictEqual('EUR')

      let next = await controller.getTokenCurrencies(oracleId1, {
        size: 1,
        next: first.page?.next
      })

      expect(next.data.length).toStrictEqual(1)
      expect(next.page?.next).toStrictEqual('TSLA-USD')

      expect(next.data[0].token).toStrictEqual('TSLA')
      expect(next.data[0].currency).toStrictEqual('USD')

      let last = await controller.getTokenCurrencies(oracleId1, {
        size: 2,
        next: next.page?.next
      })

      expect(last.data.length).toStrictEqual(0)
      expect(last.page).toBeUndefined()

      // oracleId2
      first = await controller.getTokenCurrencies(oracleId2, { size: 1 })

      expect(first.data.length).toStrictEqual(1)
      expect(first.page?.next).toStrictEqual('FB-CNY')

      expect(first.data[0].token).toStrictEqual('FB')
      expect(first.data[0].currency).toStrictEqual('CNY')

      next = await controller.getTokenCurrencies(oracleId2, {
        size: 1,
        next: first.page?.next
      })

      expect(next.data.length).toStrictEqual(1)
      expect(next.page?.next).toStrictEqual('MSFT-SGD')

      expect(next.data[0].token).toStrictEqual('MSFT')
      expect(next.data[0].currency).toStrictEqual('SGD')

      last = await controller.getTokenCurrencies(oracleId2, {
        size: 2,
        next: next.page?.next
      })

      expect(last.data.length).toStrictEqual(0)
      expect(last.page).toBeUndefined()
    })

    it('should return an empty array if get token currencies with invalid oracle id and size 100 next BAIDU-MYR which is out of range', async () => {
      const result = await controller.getTokenCurrencies('invalid', { size: 100, next: 'BAIDU-MYR' })
      expect(result.data.length).toStrictEqual(0)
      expect(result.page).toBeUndefined()
    })
  })
})

describe('2 - Oracle Price Data', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: OracleController

  let oracleId: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    await setup()
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  async function setup (): Promise<void> {
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
    const height: number = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  describe('getPriceData()', () => {
    it('should get all price data with oracle id with pagination', async () => {
      const first = await controller.getPriceData(oracleId, { size: 1 })

      expect(first.data.length).toStrictEqual(1)
      expect(first.page?.next).toStrictEqual('AAPL-EUR')

      expect(first.data[0].data.token).toStrictEqual('AAPL')
      expect(first.data[0].data.currency).toStrictEqual('EUR')
      expect(first.data[0].data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())

      const next = await controller.getPriceData(oracleId, {
        size: 1,
        next: first.page?.next
      })

      expect(next.data.length).toStrictEqual(1)
      expect(next.page?.next).toStrictEqual('TSLA-USD')

      expect(next.data[0].data.token).toStrictEqual('TSLA')
      expect(next.data[0].data.currency).toStrictEqual('USD')
      expect(next.data[0].data.amount.toString()).toStrictEqual(new BigNumber('1').toString())

      const last = await controller.getPriceData(oracleId, {
        size: 2,
        next: next.page?.next
      })

      expect(last.data.length).toStrictEqual(0)
      expect(last.page).toBeUndefined()
    })

    it('should return an empty array if get price data with invalid oracle id and size 100 next BAIDU-MYR which is out of range', async () => {
      const result = await controller.getPriceData('invalid', { size: 100, next: 'BAIDU-MYR' })
      expect(result.data.length).toStrictEqual(0)
      expect(result.page).toBeUndefined()
    })
  })
})

describe('3 - Oracle Price', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: OracleController

  let blockTime1: number
  let blockTime2: number
  let height1: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    await setup()
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const timestamp1 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time)

    const prices1 = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' },
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp1, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')
    blockTime1 = Number.parseInt((await container.call('getblockstats', [height1])).time)

    await waitForIndexedTimestamp(container, blockTime1 + 1)

    const timestamp2 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time)

    const prices2 = [
      { tokenAmount: '1.5@AAPL', currency: 'EUR' },
      { tokenAmount: '2.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp2, prices2])

    await container.generate(1)

    const height2: number = await container.call('getblockcount')
    blockTime2 = Number.parseInt((await container.call('getblockstats', [height2])).time)
    await container.generate(1)
    await waitForIndexedHeight(app, height2)
  }

  describe('getPrice()', () => {
    it('should get latest price for token and currency', async () => {
      const result = await controller.getPrice('AAPL', 'EUR')
      expect(result?.data.token).toStrictEqual('AAPL')
      expect(result?.data.currency).toStrictEqual('EUR')
      expect(result?.data.amount.toString()).toStrictEqual(new BigNumber('1.16666666666666666667').toString())
    })

    it('should return undefined if get latest price with invalid token and currency', async () => {
      const result = await controller.getPrice('invalid', 'invalid')
      expect(result).toStrictEqual(undefined)
    })
  })

  describe('getPriceByTimestamp()', () => {
    it('should get price for token and currency at specific timestamp', async () => {
      const result1 = await controller.getPriceByTimestamp('AAPL', 'EUR', blockTime1)
      expect(result1?.data.token).toStrictEqual('AAPL')
      expect(result1?.data.currency).toStrictEqual('EUR')
      expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())

      const result2 = await controller.getPriceByTimestamp('AAPL', 'EUR', blockTime2)
      expect(result2?.data.token).toStrictEqual('AAPL')
      expect(result2?.data.currency).toStrictEqual('EUR')
      expect(result2?.data.amount.toString()).toStrictEqual(new BigNumber('1.16666666666666666667').toString())
    })

    it('should return undefined if get latest price with invalid token, currency and timestamp', async () => {
      const result = await controller.getPriceByTimestamp('invalid', 'invalid', -1)
      expect(result).toStrictEqual(undefined)
    })
  })
})

describe('4 - Oracle Price Interval', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: OracleController

  let timestamp: number

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleController)

    await setup()
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'AAPL', currency: 'EUR' }]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const oracleId3 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 3])

    await container.generate(1)

    const oracleId4 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 4])

    await container.generate(1)

    timestamp = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time)

    await waitForIndexedTimestamp(container, timestamp + 2)

    const price1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId1, timestamp + 2, price1])

    await waitForIndexedTimestamp(container, timestamp + 4)

    const price2 = [{ tokenAmount: '1.0@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId2, timestamp + 4, price2])

    await waitForIndexedTimestamp(container, timestamp + 6)

    const price3 = [{ tokenAmount: '1.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId3, timestamp + 6, price3])

    await container.generate(1)

    await waitForIndexedTimestamp(container, timestamp + 8)

    const price4 = [{ tokenAmount: '2.0@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId4, timestamp + 8, price4])

    await container.generate(1)

    await waitForIndexedTimestamp(container, timestamp + 10)

    const height: number = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  describe('getPriceInterval()', () => {
    it('should get price of all time intervals between 2 timestamps with pagination', async () => {
      const first = await controller.getIntervalPrice('AAPL', 'EUR', timestamp + 2, timestamp + 8, 2, { size: 2 })

      expect(first.data.length).toStrictEqual(2)
      expect(first.page?.next).toStrictEqual((timestamp + 4).toString())

      expect(first.data[0].timestamp).toStrictEqual(timestamp + 2)
      expect(first.data[0].amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
      expect(first.data[1].timestamp).toStrictEqual(timestamp + 4)
      expect(first.data[1].amount.toString()).toStrictEqual(new BigNumber('0.83333333333333333333').toString())

      const next = await controller.getIntervalPrice('AAPL', 'EUR', timestamp + 2, timestamp + 8, 2, {
        size: 2, next: first.page?.next
      })

      expect(next.data.length).toStrictEqual(2)
      expect(next.page?.next).toStrictEqual((timestamp + 8).toString())

      expect(next.data[0].timestamp).toStrictEqual(timestamp + 6)
      expect(next.data[0].amount.toString()).toStrictEqual(new BigNumber('1.16666666666666666667').toString())
      expect(next.data[1].timestamp).toStrictEqual(timestamp + 8)
      expect(next.data[1].amount.toString()).toStrictEqual(new BigNumber('1.5').toString())

      const last = await controller.getIntervalPrice('AAPL', 'EUR', timestamp + 2, timestamp + 8, 2, {
        size: 2, next: next.page?.next
      })

      expect(last.data.length).toStrictEqual(0)
      expect(last.page).toBeUndefined()
    })
  })
})
