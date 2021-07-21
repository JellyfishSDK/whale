import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OraclePriceDataMapper } from '@src/module.model/oracle.price.data'
import { OracleState } from '@whale-api-client/api/oracle'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

describe('Price Data - setoracledata 1', () => {
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

  let oracleId1: string
  let oracleId2: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 1])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' },
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    const prices2 = [
      { tokenAmount: '1.5@FB', currency: 'CNY' },
      { tokenAmount: '2.0@MSFT', currency: 'SGD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get price data', async () => {
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const result1 = await priceDataMapper.get(oracleId1, 'AAPL', 'EUR', height1, timestamp)

    expect(result1?.id).toStrictEqual(`${oracleId1}-AAPL-EUR-${height1}-${timestamp}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId1)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
    expect(result1?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result1?.state).toStrictEqual(OracleState.LIVE)

    const result2 = await priceDataMapper.get(oracleId1, 'TSLA', 'USD', height1, timestamp)

    expect(result2?.id).toStrictEqual(`${oracleId1}-TSLA-USD-${height1}-${timestamp}`)
    expect(result2?.block.height).toStrictEqual(height1)
    expect(result2?.data.oracleId).toStrictEqual(oracleId1)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.data.amount.toString()).toStrictEqual(new BigNumber('1').toString())
    expect(result2?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result2?.state).toStrictEqual(OracleState.LIVE)

    const result3 = await priceDataMapper.get(oracleId2, 'FB', 'CNY', height2, timestamp)

    expect(result3?.id).toStrictEqual(`${oracleId2}-FB-CNY-${height2}-${timestamp}`)
    expect(result3?.block.height).toStrictEqual(height2)
    expect(result3?.data.oracleId).toStrictEqual(oracleId2)
    expect(result3?.data.token).toStrictEqual('FB')
    expect(result3?.data.currency).toStrictEqual('CNY')
    expect(result3?.data.amount.toString()).toStrictEqual(new BigNumber('1.5').toString())
    expect(result3?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result3?.state).toStrictEqual(OracleState.LIVE)

    const result4 = await priceDataMapper.get(oracleId2, 'MSFT', 'SGD', height2, timestamp)

    expect(result4?.id).toStrictEqual(`${oracleId2}-MSFT-SGD-${height2}-${timestamp}`)
    expect(result4?.block.height).toStrictEqual(height2)
    expect(result4?.data.oracleId).toStrictEqual(oracleId2)
    expect(result4?.data.token).toStrictEqual('MSFT')
    expect(result4?.data.currency).toStrictEqual('SGD')
    expect(result4?.data.amount.toString()).toStrictEqual(new BigNumber('2').toString())
    expect(result4?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result4?.state).toStrictEqual(OracleState.LIVE)

    const data1 = await container.call('listlatestrawprices', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1[0]?.rawprice).toStrictEqual(0.5)

    const data2 = await container.call('listlatestrawprices', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2[0]?.rawprice).toStrictEqual(1)

    const data3 = await container.call('listlatestrawprices', [{ token: 'FB', currency: 'CNY' }])
    expect(data3[0]?.rawprice).toStrictEqual(1.5)

    const data4 = await container.call('listlatestrawprices', [{ token: 'MSFT', currency: 'SGD' }])
    expect(data4[0]?.rawprice).toStrictEqual(2)
  })
})

describe('Price Data - setoracledata 2', () => {
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

  let oracleId: string
  let timestamp: number
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  it('should get price data if 1 price only set for 2 token currencies for an oracle', async () => {
    await waitForHeight(app, height)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const result1 = await priceDataMapper.get(oracleId, 'AAPL', 'EUR', height, timestamp)

    expect(result1?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height}-${timestamp}`)
    expect(result1?.block.height).toStrictEqual(height)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
    expect(result1?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result1?.state).toStrictEqual(OracleState.LIVE)

    const result2 = await priceDataMapper.get(oracleId, 'TSLA', 'USD', height, timestamp)
    expect(result2).toBeUndefined()

    const data1 = await container.call('listlatestrawprices', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1[0]?.rawprice).toStrictEqual(0.5)

    const data2 = await container.call('listlatestrawprices', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2[0]?.rawprice).toBeUndefined()
  })
})

describe('Price Data - setoracledata 3', () => {
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

  let oracleId: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)
    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId, timestamp, prices1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    const prices2 = [{ tokenAmount: '1.0@AAPL', currency: 'EUR' }]

    await container.call('setoracledata', [oracleId, timestamp, prices2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get price data if 2 prices data are set for the same oracle', async () => {
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const result1 = await priceDataMapper.get(oracleId, 'AAPL', 'EUR', height1, timestamp)

    expect(result1?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height1}-${timestamp}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
    expect(result1?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result1?.state).toStrictEqual(OracleState.LIVE)

    const result2 = await priceDataMapper.get(oracleId, 'AAPL', 'EUR', height2, timestamp)

    expect(result2?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height2}-${timestamp}`)
    expect(result2?.block.height).toStrictEqual(height2)
    expect(result2?.data.oracleId).toStrictEqual(oracleId)
    expect(result2?.data.token).toStrictEqual('AAPL')
    expect(result2?.data.currency).toStrictEqual('EUR')
    expect(result2?.data.amount.toString()).toStrictEqual(new BigNumber('1').toString())
    expect(result2?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result2?.state).toStrictEqual(OracleState.LIVE)

    const data = await container.call('listlatestrawprices', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data[0]?.rawprice).toStrictEqual(1)
  })
})

describe('Price Data - updateoracle', () => {
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

  let oracleId: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)

    const prices = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' },
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    const priceFeeds2 = [{ token: 'AAPL', currency: 'EUR' }]

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get price data if updateoracle removes 1 price feed', async () => {
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const result1 = await priceDataMapper.get(oracleId, 'AAPL', 'EUR', height1, timestamp)

    expect(result1?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height1}-${timestamp}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
    expect(result1?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result1?.state).toStrictEqual(OracleState.LIVE)

    const result2 = await priceDataMapper.get(oracleId, 'TSLA', 'USD', height1, timestamp)

    expect(result2?.id).toStrictEqual(`${oracleId}-TSLA-USD-${height1}-${timestamp}`)
    expect(result2?.block.height).toStrictEqual(height1)
    expect(result2?.data.oracleId).toStrictEqual(oracleId)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.data.amount.toString()).toStrictEqual(new BigNumber('1').toString())
    expect(result2?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result2?.state).toStrictEqual(OracleState.LIVE)

    const data1 = await container.call('listlatestrawprices', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1[0]?.rawprice).toStrictEqual(0.5)

    const data2 = await container.call('listlatestrawprices', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2[0]?.rawprice).toBeUndefined()
  })
})

describe('Price Data - removeoracle', () => {
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

  let oracleId: string
  let timestamp: number
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)

    const prices = [
      { tokenAmount: '0.5@AAPL', currency: 'EUR' },
      { tokenAmount: '1.0@TSLA', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    await container.call('removeoracle', [oracleId])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should not get price data', async () => {
    await waitForHeight(app, height2)

    const priceDataMapper = app.get(OraclePriceDataMapper)

    const result1 = await priceDataMapper.get(oracleId, 'AAPL', 'EUR', height1, timestamp)

    expect(result1?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height1}-${timestamp}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.data.amount.toString()).toStrictEqual(new BigNumber('0.5').toString())
    expect(result1?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result1?.state).toStrictEqual(OracleState.REMOVED)

    const result2 = await priceDataMapper.get(oracleId, 'TSLA', 'USD', height1, timestamp)

    expect(result2?.id).toStrictEqual(`${oracleId}-TSLA-USD-${height1}-${timestamp}`)
    expect(result2?.block.height).toStrictEqual(height1)
    expect(result2?.data.oracleId).toStrictEqual(oracleId)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.data.amount.toString()).toStrictEqual(new BigNumber('1').toString())
    expect(result2?.data.timestamp).toStrictEqual(timestamp.toString())
    expect(result2?.state).toStrictEqual(OracleState.REMOVED)

    const data1 = await container.call('listlatestrawprices', [{ token: 'AAPL', currency: 'EUR' }])
    expect(data1.length).toStrictEqual(0)

    const data2 = await container.call('listlatestrawprices', [{ token: 'TSLA', currency: 'USD' }])
    expect(data2.length).toStrictEqual(0)
  })
})
