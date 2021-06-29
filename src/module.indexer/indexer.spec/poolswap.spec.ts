import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { randomString, generateTimestamp } from '@src/utils'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let client: JsonRpcClient
let mapper: PoolSwapAggregationMapper
let spy: jest.SpyInstance

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()

  client = app.get<JsonRpcClient>(JsonRpcClient)

  mapper = app.get<PoolSwapAggregationMapper>(PoolSwapAggregationMapper)
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

beforeEach(async () => {
  spy = jest.spyOn(client.blockchain, 'getBlock')
    .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 5, 31, 0, 0, 0)))
    .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 5, 31, 0, 0, 0)))
    .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 10, 31, 0, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 6, 1, 4, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 0, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 1, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 2, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 3, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 4, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 5, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 6, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 7, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 8, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 9, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 10, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 11, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 12, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 13, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 14, 14, 14)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 14, 30, 39)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 14, 30, 39)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 15, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 16, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 17, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 18, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 19, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 20, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 21, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 22, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 7, 15, 23, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 8, 31, 0, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2020, 9, 1, 0, 0, 0)))
    // .mockImplementationOnce(() => generateBlock(generateTimestamp(2021, 1, 13, 0, 0, 0)))
})

afterEach(() => {
  spy.mockRestore()
})

function generateBlock (timestamp: number): any {
  const dummyScriptPubKey = {
    // https://mainnet.defichain.io/#/DFI/mainnet/tx/700473ec7ca4f6bec261e75342f91825f3c2cf60df1bf1f335b53a2bcd95b994
    // poolId: '1-0', fromAmount: 2.20509127
    asm: 'OP_RETURN 446654787317a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f',
    hex: '6a4c4f446654787317a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f'
  }

  return {
    hash: randomString(64),
    height: 1,
    tx: [{
      txid: randomString(64),
      vin: [],
      vout: [{
        scriptPubKey: dummyScriptPubKey,
        n: 0,
        value: new BigNumber('26')
      }]
    }],
    time: timestamp
  }
}

it('should query by date range', async () => {
  await waitForHeight(app, 20)

  // const aggregations = await mapper.query('1-0', 100, '2020-06-01T00:00', '2020-08-31T00:00')
  const aggregations = await mapper.query('1-0', 100)
  console.log('aggregations: ', aggregations)

  // indexed data get undefined
  const agg1 = await mapper.get('1-0-2020-10-31T00:00')
  console.log('agg1: ', agg1)

  // manual data can get
  const agg2 = await mapper.get('1-0-2020-08-31T19:20')
  console.log('agg2: ', agg2)

  // ignore below
  // expect(aggregations.length).toStrictEqual(3)

  // expect(aggregations[0].id).toStrictEqual('2020-08-31')
  // for (const hour in aggregations.bucket) {
  //   const bucket = aggregations.bucket[hour]
  //   if (bucket.count !== 0) {
  //     expect(bucket.total).toStrictEqual('2.20509127')
  //     expect(bucket.count).toStrictEqual(1)
  //     expect(hour).toStrictEqual('0')
  //   }
  // }

  // expect(aggregations[1].id).toStrictEqual('2020-07-15')
  // for (const hour in aggregations[1].bucket) {
  //   const bucket = aggregations[1].bucket[hour]
  //   expect(bucket.total).not.toStrictEqual(0)
  //   expect(bucket.count).not.toStrictEqual(0)
  //   if (hour === '14') {
  //     expect(bucket.total).toStrictEqual(new BigNumber(2.20509127).times(3).toString())
  //     expect(bucket.count).toStrictEqual(3)
  //   }
  // }

  // expect(aggregations[2].id).toStrictEqual('2020-06-01')
  // for (const hour in aggregations[2].bucket) {
  //   const bucket = aggregations[2].bucket[hour]
  //   if (bucket.count !== 0) {
  //     expect(bucket.total).toStrictEqual('2.20509127')
  //     expect(bucket.count).toStrictEqual(1)
  //     expect(hour).toStrictEqual('4')
  //   }
  // }
})

// it('should query with limit', async () => {
//   const aggregations = await mapper.query(1, '2020-01-01', '2020-12-31')
//   expect(aggregations.length).toStrictEqual(1)
//   expect(aggregations[0].id).toStrictEqual('2020-09-01')
// })

// it('should query and get empty data as out of range', async () => {
//   const aggregations = await mapper.query(100, '1990-01-01', '1990-12-31')
//   expect(aggregations.length).toStrictEqual(0)
// })
