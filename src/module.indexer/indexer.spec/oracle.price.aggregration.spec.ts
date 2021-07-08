import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'

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

describe('PriceAggregration - 1', () => {
  let oracleId: string
  let height: number
  let time: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' },
      { tokenAmount: '1.0@TESL', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height = await container.call('getblockcount')

    const hash = await container.call('getblockhash', [height])
    const block = await await container.call('getblock', [hash, 1])

    time = block.time
  }

  it('Should get oracle aggregration price data for an oracle', async () => {
    await setup()
    await waitForHeight(app, height)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const agg1 = await priceAggregrationMapper.get('APPL', 'EUR', height, time)

    expect(agg1?.data.token).toStrictEqual('APPL')
    expect(agg1?.data.currency).toStrictEqual('EUR')
    expect(agg1?.data.amount).toStrictEqual(0.5)

    const agg2 = await priceAggregrationMapper.get('TESL', 'USD', height, time)

    expect(agg2?.data.token).toStrictEqual('TESL')
    expect(agg2?.data.currency).toStrictEqual('USD')
    expect(agg2?.data.amount).toStrictEqual(1)

    const data1 = await container.call('getprice', [{ token: 'APPL', currency: 'EUR' }])
    expect(data1).toStrictEqual(0.5)

    const data2 = await container.call('getprice', [{ token: 'TESL', currency: 'USD' }])
    expect(data2).toStrictEqual(1)
  })
})

describe('PriceAggregration - 2', () => {
  let oracleId1: string
  let oracleId2: string
  let height: number
  let time: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' },
      { tokenAmount: '1.0@TESL', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    await container.generate(1)

    const prices2 = [
      { tokenAmount: '1.5@APPL', currency: 'EUR' },
      { tokenAmount: '2.0@TESL', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    height = await container.call('getblockcount')

    const hash = await container.call('getblockhash', [height])
    const block = await await container.call('getblock', [hash, 1])
    time = block.time
  }

  it('Should get oracle aggregration price data', async () => {
    await setup()
    await waitForHeight(app, height)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const agg1 = await priceAggregrationMapper.get('APPL', 'EUR', height, time)

    expect(agg1?.data.token).toStrictEqual('APPL')
    expect(agg1?.data.currency).toStrictEqual('EUR')
    expect(agg1?.data.amount).toStrictEqual(1.1666666666666667)

    const agg2 = await priceAggregrationMapper.get('TESL', 'USD', height, time)

    expect(agg2?.data.token).toStrictEqual('TESL')
    expect(agg2?.data.currency).toStrictEqual('USD')
    expect(agg2?.data.amount).toStrictEqual(1.6666666666666667)

    const data1 = await container.call('getprice', [{ token: 'APPL', currency: 'EUR' }])
    expect(data1).toStrictEqual(1.16666666)

    const data2 = await container.call('getprice', [{ token: 'TESL', currency: 'USD' }])
    expect(data2).toStrictEqual(1.66666666)
  })
})

describe('PriceAggregration - 3', () => {
  let oracleId1: string
  let oracleId2: string
  let height: number
  let time: number

  async function setup (): Promise<void> {
    const priceFeeds = [
      { token: 'FB', currency: 'CNY' }
    ]

    oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000) - 5000

    const prices1 = [
      { tokenAmount: '0.5@FB', currency: 'CNY' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp1, prices1])

    await container.generate(1)

    const prices2 = [
      { tokenAmount: '1.0@FB', currency: 'CNY' }
    ]

    const timestamp2 = Math.floor(new Date().getTime() / 1000) + 5000

    await container.call('setoracledata', [oracleId2, timestamp2, prices2])

    await container.generate(1)

    height = await container.call('getblockcount')

    const hash = await container.call('getblockhash', [height])
    const block = await await container.call('getblock', [hash, 1])

    time = block.time
  }

  it('Should not get oracle aggregration price data if their timestamp is out of range', async () => {
    await setup()
    await waitForHeight(app, height)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)

    const agg = await priceAggregrationMapper.get('FB', 'CNY', height, time)

    expect(agg).toStrictEqual(undefined)

    const promise = container.call('getprice', [{ token: 'FB', currency: 'CNY' }])

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'no live oracles for specified request\', code: -1')
  })
})
