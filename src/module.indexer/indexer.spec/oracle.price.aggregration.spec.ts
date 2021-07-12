import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import {
  createIndexerTestModule,
  stopIndexer,
  waitForHeight,
  waitForTime
} from '@src/module.indexer/indexer.spec/_testing.module'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

describe('PriceAggregration - 1', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(20)

    app = await createIndexerTestModule(container)
    await app.init()

    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    try {
      await stopIndexer(app)
    } finally {
      await container.stop()
    }
  })

  let height1: number
  let height2: number
  let blockTime1: number
  let blockTime2: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 1])

    await container.generate(1)

    const prices1 = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' }
    ]

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')
    blockTime1 = Number((await container.call('getblockstats', [height1])).time)

    await waitForTime(container, blockTime1 + 1)

    const prices2 = [
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
    blockTime2 = Number((await container.call('getblockstats', [height2])).time)
  }

  it('Should get oracle aggregration price data for an oracle', async () => {
    await waitForHeight(app, height2)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const agg1 = await priceAggregrationMapper.get('AAPL', 'EUR', height1, blockTime1)

    expect(agg1?.data.token).toStrictEqual('AAPL')
    expect(agg1?.data.currency).toStrictEqual('EUR')
    expect(agg1?.data.amount).toStrictEqual(0.5)

    const agg2 = await priceAggregrationMapper.get('TSLA', 'USD', height2, blockTime2)

    expect(agg2?.data.token).toStrictEqual('TSLA')
    expect(agg2?.data.currency).toStrictEqual('USD')
    expect(agg2?.data.amount).toStrictEqual(1)

    const data1 = await container.call('getprice', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1).toStrictEqual(0.5)

    const data2 = await container.call('getprice', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2).toStrictEqual(1)
  })
})

describe('PriceAggregration - 2', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(20)

    app = await createIndexerTestModule(container)
    await app.init()

    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    try {
      await stopIndexer(app)
    } finally {
      await container.stop()
    }
  })

  let timestamp1: number
  let timestamp2: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
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
  }

  it('Should get oracle aggregration price data', async () => {
    await waitForHeight(app, height2)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const agg1 = await priceAggregrationMapper.get('AAPL', 'EUR', height1, timestamp1)

    expect(agg1?.data.token).toStrictEqual('AAPL')
    expect(agg1?.data.currency).toStrictEqual('EUR')
    expect(agg1?.data.amount).toStrictEqual(0.5)

    const agg2 = await priceAggregrationMapper.get('AAPL', 'EUR', height2, timestamp2)

    expect(agg2?.data.token).toStrictEqual('AAPL')
    expect(agg2?.data.currency).toStrictEqual('EUR')
    expect(agg2?.data.amount).toStrictEqual(1.1666666666666667)

    const agg3 = await priceAggregrationMapper.get('TSLA', 'USD', height1, timestamp1)

    expect(agg3?.data.token).toStrictEqual('TSLA')
    expect(agg3?.data.currency).toStrictEqual('USD')
    expect(agg3?.data.amount).toStrictEqual(1)

    const agg4 = await priceAggregrationMapper.get('TSLA', 'USD', height2, timestamp2)

    expect(agg4?.data.token).toStrictEqual('TSLA')
    expect(agg4?.data.currency).toStrictEqual('USD')
    expect(agg4?.data.amount).toStrictEqual(1.6666666666666667)

    const data1 = await container.call('getprice', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1).toStrictEqual(1.16666666)

    const data2 = await container.call('getprice', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2).toStrictEqual(1.66666666)
  })
})

describe('PriceAggregration - 3', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(20)

    app = await createIndexerTestModule(container)
    await app.init()

    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    try {
      await stopIndexer(app)
    } finally {
      await container.stop()
    }
  })

  let timestamp1: number
  let timestamp2: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    const priceFeeds2 = [
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 1])

    await container.generate(1)

    let stats = await container.call('getblockstats', [await container.call('getblockcount')])
    let timestamp = Number(stats.time) - 5000

    const prices1 = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')
    timestamp1 = Number((await container.call('getblockstats', [height1])).time)

    await container.generate(30)

    stats = await container.call('getblockstats', [await container.call('getblockcount')])
    timestamp = Number(stats.time) + 5000

    const prices2 = [
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
    timestamp2 = Number((await container.call('getblockstats', [height2])).time) + 5000
  }

  it('Should not get oracle aggregration price data if their timestamp is out of range', async () => {
    await waitForHeight(app, height2)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const agg1 = await priceAggregrationMapper.get('AAPL', 'EUR', height1, timestamp1)
    const agg2 = await priceAggregrationMapper.get('TSLA', 'USD', height2, timestamp2)

    expect(agg1).toStrictEqual(undefined)
    expect(agg2).toStrictEqual(undefined)

    const promise1 = container.call('getprice', [{ token: 'AAPL', currency: 'EUR' }])
    const promise2 = container.call('getprice', [{ token: 'TSLA', currency: 'USD' }])

    await expect(promise1).rejects.toThrow(DeFiDRpcError)
    await expect(promise1).rejects.toThrow('DeFiDRpcError: \'no live oracles for specified request\', code: -1')

    await expect(promise2).rejects.toThrow(DeFiDRpcError)
    await expect(promise2).rejects.toThrow('DeFiDRpcError: \'no live oracles for specified request\', code: -1')
  })
})
