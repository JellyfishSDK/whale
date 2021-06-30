import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import crypto from 'crypto'

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
  // Note(canonbrother): to prevent index got invalidated as mocking 'client.blockchain.getBlock' will never get the best chain
  spy = jest.spyOn(mapper, 'delete').mockImplementation()

  spy = jest.spyOn(client.blockchain, 'getBlock')
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 8, 31, 23, 59, 59)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 0, 0, 0)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 18, 11, 23)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 18, 12, 25)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 18, 14, 1)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 18, 19, 36)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 18, 20, 1)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 1, 18, 21, 56)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 15, 15, 15, 15)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 9, 30, 23, 59, 59)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2020, 10, 1, 0, 0, 0)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], generateTimestamp(2021, 4, 1, 0, 0, 0)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[1], generateTimestamp(2020, 10, 2, 0, 0, 0)))
    .mockImplementationOnce(() => generateBlock(dummyScripts[1], generateTimestamp(2021, 4, 1, 0, 0, 0)))

  await waitForHeight(app, 1)
})

afterEach(() => {
  spy.mockRestore()
})

const dummyScripts = [
  {
    // https://mainnet.defichain.io/#/DFI/mainnet/tx/700473ec7ca4f6bec261e75342f91825f3c2cf60df1bf1f335b53a2bcd95b994
    // poolId: '0-1', fromAmount: 2.20509127
    asm: 'OP_RETURN 446654787317a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f',
    hex: '6a4c4f446654787317a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f'
  },
  {
    // https://mainnet.defichain.io/#/DFI/mainnet/tx/c2a489adbebf97fb1dd0c695ee6d1f54eca4ea60165f12fd17f90923d6181d3e
    // poolId: '0-2', fromAmount: 1100
    asm: 'OP_RETURN 446654787317a914fe7d87680b758782401e747f8228cadc610b2047870000cc829c190000001976a91442511183ba47347712f9f3dca5d2d003b2e78d4888ac02ffffffffffffff7fffffffffffffff7f',
    hex: '6a4c51446654787317a914fe7d87680b758782401e747f8228cadc610b2047870000cc829c190000001976a91442511183ba47347712f9f3dca5d2d003b2e78d4888ac02ffffffffffffff7fffffffffffffff7f'
  }
]

function generateBlock (dummyScript: any, timestamp: number): any {
  return {
    hash: crypto.randomBytes(32).toString('hex'),
    height: 1,
    tx: [{
      txid: crypto.randomBytes(32).toString('hex'),
      vin: [],
      vout: [{
        scriptPubKey: dummyScript,
        n: 0,
        value: new BigNumber('26.78348323')
      }]
    }],
    time: timestamp
  }
}

function generateTimestamp (
  year: number = 0, month: number = 1, day: number = 0,
  hours: number = 0, minutes: number = 0, seconds: number = 0
): number {
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds)).valueOf() / 1000
}

it('should query with date range', async () => {
  const aggregations = await mapper.query('0-1', 100, '2020-09-01T00:00', '2020-09-30T23:59')
  expect(aggregations.length).toStrictEqual(5)

  expect(aggregations[0].id).toStrictEqual('0-1@2020-09-30T23:50')
  expect(aggregations[0].total).toStrictEqual('2.20509127')
  expect(aggregations[0].count).toStrictEqual(1)

  expect(aggregations[1].id).toStrictEqual('0-1@2020-09-15T15:10')

  expect(aggregations[2].id).toStrictEqual('0-1@2020-09-01T18:20')
  expect(aggregations[2].total).toStrictEqual('4.41018254')
  expect(aggregations[2].count).toStrictEqual(2)

  expect(aggregations[3].id).toStrictEqual('0-1@2020-09-01T18:10')
  expect(aggregations[3].total).toStrictEqual('8.82036508')
  expect(aggregations[3].count).toStrictEqual(4)

  expect(aggregations[4].id).toStrictEqual('0-1@2020-09-01T00:00')
})

it('should query with from only', async () => {
  const aggregations = await mapper.query('0-2', 100, '2020-10-01T00:00')
  expect(aggregations.length).toStrictEqual(2)
})

it('should query with to only', async () => {
  const aggregations = await mapper.query('0-1', 100, undefined, '2020-09-12T00:00')
  expect(aggregations.length).toStrictEqual(4)
})

it('should query and list all', async () => {
  const aggregations = await mapper.query('0-1', 100)
  expect(aggregations.length).toStrictEqual(8)
})

it('should query with limit', async () => {
  const aggregations = await mapper.query('0-1', 1, '2020-09-01T00:00', '2020-09-30T23:59')
  expect(aggregations.length).toStrictEqual(1)
  expect(aggregations[0].id).toStrictEqual('0-1@2020-09-30T23:50')
})

it('should query and get empty as out of range', async () => {
  const aggregations = await mapper.query('0-1', 100, '1990-01-01T00:00', '1990-12-31T00:00')
  expect(aggregations.length).toStrictEqual(0)
})

it('should query and get empty as the poolpair has no trades', async () => {
  const aggregations = await mapper.query('999-1', 100)
  expect(aggregations.length).toStrictEqual(0)
})
