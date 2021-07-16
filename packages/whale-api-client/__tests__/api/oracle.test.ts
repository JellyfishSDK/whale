import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { OracleState } from '../../src/api/oracle'
import { StubWhaleApiClient } from '../stub.client'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

describe('1 - Oracle Token Currency', () => {
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
    await service.waitForIndexedHeight(height + 5)
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
      expect(first[0].state).toStrictEqual(OracleState.REMOVED)

      expect(first[1].token).toStrictEqual('FB')
      expect(first[1].currency).toStrictEqual('CNY')
      expect(first[1].state).toStrictEqual(OracleState.REMOVED)

      const next = await client.paginate(first)

      expect(next.length).toStrictEqual(2)
      expect(next.hasNext).toStrictEqual(true)
      expect(next.nextToken).toStrictEqual('TSLA-USD')

      expect(next[0].token).toStrictEqual('MSFT')
      expect(next[0].currency).toStrictEqual('SGD')
      expect(next[0].state).toStrictEqual(OracleState.LIVE)

      expect(next[1].token).toStrictEqual('TSLA')
      expect(next[1].currency).toStrictEqual('USD')
      expect(next[1].state).toStrictEqual(OracleState.LIVE)

      const last = await client.paginate(next)

      expect(last.length).toStrictEqual(0)
      expect(last.hasNext).toStrictEqual(false)
      expect(last.nextToken).toBeUndefined()
    })
  })

  describe('getTokenCurrencies()', () => {
    it('should get all token currencies with oracle id', async () => {
      const result1 = await client.oracle.getTokenCurrencies(oracleId1) ?? []
      expect(result1.length).toStrictEqual(2)

      expect(result1[0]?.data.token).toStrictEqual('AAPL')
      expect(result1[0]?.data.currency).toStrictEqual('EUR')
      expect(result1[0]?.state).toStrictEqual(OracleState.REMOVED)

      expect(result1[1]?.data.token).toStrictEqual('TSLA')
      expect(result1[1]?.data.currency).toStrictEqual('USD')
      expect(result1[1]?.state).toStrictEqual(OracleState.LIVE)

      const result2 = await client.oracle.getTokenCurrencies(oracleId2) ?? []
      expect(result2.length).toStrictEqual(2)

      expect(result2[0]?.data.token).toStrictEqual('FB')
      expect(result2[0]?.data.currency).toStrictEqual('CNY')
      expect(result2[0]?.state).toStrictEqual(OracleState.REMOVED)

      expect(result2[1]?.data.token).toStrictEqual('MSFT')
      expect(result2[1]?.data.currency).toStrictEqual('SGD')
      expect(result2[1]?.state).toStrictEqual(OracleState.LIVE)
    })

    it('should return empty array if get token currencies with invalid oracle id', async () => {
      const result = await client.oracle.getTokenCurrencies('invalid')
      expect(result).toStrictEqual([])
    })
  })
})

describe('2 - Oracle Price Data', () => {
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
    await service.waitForIndexedHeight(height + 5)
  }

  describe('getPriceData()', () => {
    it('should get all price data with oracle id', async () => {
      const result = await client.oracle.getPriceData(oracleId) ?? []
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
      const result = await client.oracle.getPriceData('invalid')
      expect(result).toStrictEqual([])
    })
  })
})

describe('3 - Oracle Price', () => {
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

    await service.waitForIndexedHeight(height2 + 5)
  }

  describe('getPrice()', () => {
    it('should get latest price for token and currency', async () => {
      const result = await client.oracle.getPrice('AAPL', 'EUR')
      expect(result?.data.token).toStrictEqual('AAPL')
      expect(result?.data.currency).toStrictEqual('EUR')
      expect(result?.data.amount).toStrictEqual(1.1666666666666667)
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
      expect(result1?.data.amount).toStrictEqual(0.5)

      const result2 = await client.oracle.getPriceByTimestamp('AAPL', 'EUR', blockTime2)
      expect(result2?.data.token).toStrictEqual('AAPL')
      expect(result2?.data.currency).toStrictEqual('EUR')
      expect(result2?.data.amount).toStrictEqual(1.1666666666666667)
    })

    it('should return undefined if get latest price with invalid token, currency and timestamp', async () => {
      const result = await client.oracle.getPriceByTimestamp('invalid', 'invalid', -1)
      expect(result).toStrictEqual(undefined)
    })
  })
})

describe('4 - Oracle Price Interval', () => {
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

    const height: number = await container.call('getblockcount')
    await service.waitForIndexedHeight(height + 5)
  }

  describe('getPriceInterval()', () => {
    it('should get price of all time intervals between 2 timestamps', async () => {
      const result = await client.oracle.getIntervalPrice('AAPL', 'EUR', timestamp + 2, timestamp + 8, 2)
      expect(result).toStrictEqual([
        { timestamp: timestamp + 2, amount: 0.5 },
        { timestamp: timestamp + 4, amount: 0.8333333333333334 },
        { timestamp: timestamp + 6, amount: 1.1666666666666667 },
        { timestamp: timestamp + 8, amount: 1.5 }
      ])
    })
  })
})
