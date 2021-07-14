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

describe('Price Aggregration - 1', () => {
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
    const priceFeeds1 = [{ token: 'AAPL', currency: 'EUR' }]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [{ token: 'TSLA', currency: 'USD' }]

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    const timestamp1 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time)
    await container.call('setoracledata', [oracleId1, timestamp1, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')
    blockTime1 = Number.parseInt((await container.call('getblockstats', [height1])).time)

    await waitForTime(container, blockTime1 + 1)

    const timestamp2 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time)

    const prices2 = [
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp2, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
    blockTime2 = Number.parseInt((await container.call('getblockstats', [height2])).time)
  }

  it('should get oracle price aggregration', async () => {
    await waitForHeight(app, height2 + 5)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const result1 = await priceAggregrationMapper.get('AAPL', 'EUR', height1, blockTime1)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.block.time).toStrictEqual(blockTime1)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount).toStrictEqual(0.5)

    const result2 = await priceAggregrationMapper.get('TSLA', 'USD', height2, blockTime2)
    expect(result2?.block.height).toStrictEqual(height2)
    expect(result2?.block.time).toStrictEqual(blockTime2)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.data.amount).toStrictEqual(1)

    const data1 = await container.call('getprice', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1).toStrictEqual(0.5)

    const data2 = await container.call('getprice', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2).toStrictEqual(1)
  })
})

describe('Price Aggregration - 2', () => {
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

    await waitForTime(container, blockTime1 + 1)

    const timestamp2 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time)

    const prices2 = [
      { tokenAmount: '1.5@AAPL', currency: 'EUR' },
      { tokenAmount: '2.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp2, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
    blockTime2 = Number.parseInt((await container.call('getblockstats', [height2])).time)
  }

  it('should get oracle price aggregration with correct sum of 2 prices', async () => {
    await waitForHeight(app, height2 + 5)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const result1 = await priceAggregrationMapper.get('AAPL', 'EUR', height1, blockTime1)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.block.time).toStrictEqual(blockTime1)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount).toStrictEqual(0.5)

    const result2 = await priceAggregrationMapper.get('TSLA', 'USD', height1, blockTime1)
    expect(result2?.block.height).toStrictEqual(height1)
    expect(result2?.block.time).toStrictEqual(blockTime1)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.data.amount).toStrictEqual(1)

    const result3 = await priceAggregrationMapper.get('AAPL', 'EUR', height2, blockTime2)
    expect(result3?.block.height).toStrictEqual(height2)
    expect(result3?.block.time).toStrictEqual(blockTime2)
    expect(result3?.data.token).toStrictEqual('AAPL')
    expect(result3?.data.currency).toStrictEqual('EUR')
    expect(result3?.data.amount).toStrictEqual(1.1666666666666667)

    const result4 = await priceAggregrationMapper.get('TSLA', 'USD', height2, blockTime2)
    expect(result4?.block.height).toStrictEqual(height2)
    expect(result4?.block.time).toStrictEqual(blockTime2)
    expect(result4?.data.token).toStrictEqual('TSLA')
    expect(result4?.data.currency).toStrictEqual('USD')
    expect(result4?.data.amount).toStrictEqual(1.6666666666666667)

    const data1 = await container.call('getprice', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1).toStrictEqual(1.16666666)

    const data2 = await container.call('getprice', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2).toStrictEqual(1.66666666)
  })
})

describe('Price Aggregration - 3', () => {
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

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    const timestamp1 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time) - 5000

    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId1, timestamp1, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')
    blockTime1 = Number((await container.call('getblockstats', [height1])).time)

    await waitForTime(container, blockTime1 + 1)

    const timestamp2 = Number.parseInt((await container.call('getblockstats', [await container.call('getblockcount')])).time) + 5000

    const prices2 = [{ tokenAmount: '1.0@TSLA', currency: 'USD' }]

    await container.call('setoracledata', [oracleId2, timestamp2, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
    blockTime2 = Number.parseInt((await container.call('getblockstats', [height2])).time)
  }

  it('should not get oracle price aggregration if the timestamp is out of range', async () => {
    await waitForHeight(app, height2 + 5)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const result1 = await priceAggregrationMapper.get('AAPL', 'EUR', height1, blockTime1)
    expect(result1).toStrictEqual(undefined)

    const result2 = await priceAggregrationMapper.get('TSLA', 'USD', height2, blockTime2)
    expect(result2).toStrictEqual(undefined)

    const promise1 = container.call('getprice', [{ token: 'AAPL', currency: 'EUR' }])
    await expect(promise1).rejects.toThrow(DeFiDRpcError)
    await expect(promise1).rejects.toThrow('DeFiDRpcError: \'no live oracles for specified request\', code: -1')

    const promise2 = container.call('getprice', [{ token: 'TSLA', currency: 'USD' }])
    await expect(promise2).rejects.toThrow(DeFiDRpcError)
    await expect(promise2).rejects.toThrow('DeFiDRpcError: \'no live oracles for specified request\', code: -1')
  })
})
