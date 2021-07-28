import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { StubWhaleApiClient } from '../stub.client'
import BigNumber from 'bignumber.js'

describe('1 - Oracle Token Currency', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  let oracleId1: string
  let oracleId2: string

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await setup()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
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
    await service.waitForIndexedHeight(height)
  }

  describe('listTokenCurrencies()', () => {
    it('should list token currencies with pagination', async () => {
      // Result sorted by token currency
      const first = await client.oracle.listTokenCurrencies(2)

      expect(first.length).toStrictEqual(2)
      expect(first.hasNext).toStrictEqual(true)
      expect(first.nextToken).toStrictEqual('FB-CNY')

      expect(first[0].token).toStrictEqual('AAPL')
      expect(first[0].currency).toStrictEqual('EUR')

      expect(first[1].token).toStrictEqual('FB')
      expect(first[1].currency).toStrictEqual('CNY')

      const next = await client.paginate(first)

      expect(next.length).toStrictEqual(2)
      expect(next.hasNext).toStrictEqual(true)
      expect(next.nextToken).toStrictEqual('TSLA-USD')

      expect(next[0].token).toStrictEqual('MSFT')
      expect(next[0].currency).toStrictEqual('SGD')

      expect(next[1].token).toStrictEqual('TSLA')
      expect(next[1].currency).toStrictEqual('USD')

      const last = await client.paginate(next)

      expect(last.length).toStrictEqual(0)
      expect(last.hasNext).toStrictEqual(false)
      expect(last.nextToken).toBeUndefined()
    })
  })

  describe('getTokenCurrencies()', () => {
    it('should get all token currencies with oracle id with pagination', async () => {
      // oracleId1
      let first = await client.oracle.getTokenCurrencies(oracleId1, 1)

      expect(first.length).toStrictEqual(1)
      expect(first.hasNext).toStrictEqual(true)
      expect(first.nextToken).toStrictEqual('AAPL-EUR')

      expect(first[0]?.token).toStrictEqual('AAPL')
      expect(first[0]?.currency).toStrictEqual('EUR')

      let next = await client.paginate(first)

      expect(next.length).toStrictEqual(1)
      expect(next.hasNext).toStrictEqual(true)
      expect(next.nextToken).toStrictEqual('TSLA-USD')

      expect(next[0]?.token).toStrictEqual('TSLA')
      expect(next[0]?.currency).toStrictEqual('USD')

      let last = await client.paginate(next)

      expect(last.length).toStrictEqual(0)
      expect(last.hasNext).toStrictEqual(false)
      expect(last.nextToken).toBeUndefined()

      // oracleId2
      first = await client.oracle.getTokenCurrencies(oracleId2, 1)

      expect(first.length).toStrictEqual(1)
      expect(first.hasNext).toStrictEqual(true)
      expect(first.nextToken).toStrictEqual('FB-CNY')

      expect(first[0]?.token).toStrictEqual('FB')
      expect(first[0]?.currency).toStrictEqual('CNY')

      next = await client.paginate(first)

      expect(next.length).toStrictEqual(1)
      expect(next.hasNext).toStrictEqual(true)
      expect(next.nextToken).toStrictEqual('MSFT-SGD')

      expect(next[0]?.token).toStrictEqual('MSFT')
      expect(next[0]?.currency).toStrictEqual('SGD')

      last = await client.paginate(next)

      expect(last.length).toStrictEqual(0)
      expect(last.hasNext).toStrictEqual(false)
      expect(last.nextToken).toBeUndefined()
    })

    it('should return an empty array if get token currencies with invalid oracle id', async () => {
      const result = await client.oracle.getTokenCurrencies('invalid')
      expect(result.length).toStrictEqual(0)
      expect(result.hasNext).toStrictEqual(false)
      expect(result.nextToken).toBeUndefined()
    })
  })
})

describe('2 - Oracle Price Data', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  let oracleId: string

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await setup()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
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
    await service.waitForIndexedHeight(height)
  }

  describe('getPriceData()', () => {
    it('should get all price data with oracle id with pagination', async () => {
      const first = await client.oracle.getPriceData(oracleId, 1)

      expect(first.length).toStrictEqual(1)
      expect(first.hasNext).toStrictEqual(true)
      expect(first.nextToken).toStrictEqual('AAPL-EUR')

      expect(first[0]?.data.token).toStrictEqual('AAPL')
      expect(first[0]?.data.currency).toStrictEqual('EUR')
      expect(first[0]?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())

      const next = await client.paginate(first)

      expect(next.length).toStrictEqual(1)
      expect(next.hasNext).toStrictEqual(true)
      expect(next.nextToken).toStrictEqual('TSLA-USD')

      expect(next[0]?.data.token).toStrictEqual('TSLA')
      expect(next[0]?.data.currency).toStrictEqual('USD')
      expect(next[0]?.data.amount.toString()).toStrictEqual(new BigNumber('1').toString())

      const last = await client.paginate(next)

      expect(last.length).toStrictEqual(0)
      expect(last.hasNext).toStrictEqual(false)
      expect(last.nextToken).toBeUndefined()
    })

    it('should return an empty array if get price data with invalid oracle id', async () => {
      const result = await client.oracle.getPriceData('invalid')
      expect(result.length).toStrictEqual(0)
      expect(result.hasNext).toStrictEqual(false)
      expect(result.nextToken).toBeUndefined()
    })
  })
})

describe('3 - Oracle Price', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  let blockTime1: number
  let blockTime2: number
  let height1: number

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await setup()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
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

    await service.waitForIndexedTimestamp(container, blockTime1 + 1)

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
    await service.waitForIndexedHeight(height2)
  }

  describe('getPrice()', () => {
    it('should get latest price for token and currency', async () => {
      const result = await client.oracle.getPrice('AAPL', 'EUR')
      expect(result?.data.token).toStrictEqual('AAPL')
      expect(result?.data.currency).toStrictEqual('EUR')
      expect(result?.data.amount.toString()).toStrictEqual(new BigNumber('1.16666666666666666667').toString())
    })

    it('should return undefined if get latest price with invalid token and currency', async () => {
      const result = await client.oracle.getPrice('invalid', 'invalid')
      expect(result).toStrictEqual(undefined)
    })
  })

  describe('getPriceByTimestamp()', () => {
    it('should get price for token and currency at specific timestamp', async () => {
      const result1 = await client.oracle.getPriceByTimestamp('AAPL', 'EUR', blockTime1)
      expect(result1?.data.token).toStrictEqual('AAPL')
      expect(result1?.data.currency).toStrictEqual('EUR')
      expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())

      const result2 = await client.oracle.getPriceByTimestamp('AAPL', 'EUR', blockTime2)
      expect(result2?.data.token).toStrictEqual('AAPL')
      expect(result2?.data.currency).toStrictEqual('EUR')
      expect(result2?.data.amount.toString()).toStrictEqual(new BigNumber('1.16666666666666666667').toString())
    })

    it('should return undefined if get latest price with invalid token, currency and timestamp', async () => {
      const result = await client.oracle.getPriceByTimestamp('invalid', 'invalid', -1)
      expect(result).toStrictEqual(undefined)
    })
  })
})

describe('4 - Oracle Price Interval', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  let timestamp: number

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await setup()
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
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

    await service.waitForIndexedTimestamp(container, timestamp + 2)

    const price1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId1, timestamp + 2, price1])

    await service.waitForIndexedTimestamp(container, timestamp + 4)

    const price2 = [{ tokenAmount: '1.0@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId2, timestamp + 4, price2])

    await service.waitForIndexedTimestamp(container, timestamp + 6)

    const price3 = [{ tokenAmount: '1.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId3, timestamp + 6, price3])

    await container.generate(1)

    await service.waitForIndexedTimestamp(container, timestamp + 8)

    const price4 = [{ tokenAmount: '2.0@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId4, timestamp + 8, price4])

    await service.waitForIndexedTimestamp(container, timestamp + 10)

    const height: number = await container.call('getblockcount')
    await container.generate(1)
    await service.waitForIndexedHeight(height)
  }

  describe('getPriceInterval()', () => {
    it('should get price of all time intervals between 2 timestamps with pagination', async () => {
      const first = await client.oracle.getIntervalPrice('AAPL', 'EUR', timestamp + 2, timestamp + 8, 2, 2)

      expect(first.length).toStrictEqual(2)
      expect(first.hasNext).toStrictEqual(true)
      expect(first.nextToken).toStrictEqual((timestamp + 4).toString())

      expect(first[0].timestamp).toStrictEqual(timestamp + 2)
      expect(first[0].amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
      expect(first[1].timestamp).toStrictEqual(timestamp + 4)
      expect(first[1].amount.toString()).toStrictEqual(new BigNumber('0.8333333333333334').toString())

      const next = await client.paginate(first)

      expect(next.length).toStrictEqual(2)
      expect(next.hasNext).toStrictEqual(true)
      expect(next.nextToken).toStrictEqual((timestamp + 8).toString())

      expect(next[0]?.timestamp).toStrictEqual(timestamp + 6)
      expect(next[0]?.amount.toString()).toStrictEqual(new BigNumber(1.1666666666666667).toString())
      expect(next[1]?.timestamp).toStrictEqual(timestamp + 8)
      expect(next[1]?.amount.toString()).toStrictEqual(new BigNumber(1.5).toString())

      const last = await client.paginate(next)

      expect(last.length).toStrictEqual(0)
      expect(last.hasNext).toStrictEqual(false)
      expect(last.nextToken).toBeUndefined()
    })
  })
})
