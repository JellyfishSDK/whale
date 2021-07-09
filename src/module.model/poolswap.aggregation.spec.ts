import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import BigNumber from 'bignumber.js'

let database: Database
let mapper: PoolSwapAggregationMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [PoolSwapAggregationMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<PoolSwapAggregationMapper>(PoolSwapAggregationMapper)
})

afterAll(async () => {
  await (database as LevelDatabase).close()
})

async function setup (): Promise<void> {
  async function put (poolId: string, bucketId: number, tokenA: any, tokenB: any): Promise<void> {
    await mapper.put({
      id: `${poolId}_${bucketId}`,
      poolId: poolId,
      bucketId: bucketId,
      volume: {
        [tokenA.id]: {
          total: tokenA.total,
          count: tokenA.count
        },
        [tokenB.id]: {
          total: tokenB.total,
          count: tokenB.count
        }
      }
    })
  }

  await put(
    'BTC-DFI', 1581724800000, // '2020-02-15T00:00Z'
    { id: '1', total: new BigNumber('2.20509127'), count: 1 },
    { id: '0', total: new BigNumber('13.0005312'), count: 21 }
  )
  await put(
    'BTC-DFI', 1582411200000, // '2020-02-22T22:40Z'
    { id: '1', total: new BigNumber('23.23000042'), count: 20 },
    { id: '0', total: new BigNumber('44.5523202'), count: 15 })
  await put(
    'BTC-DFI', 1582601400000, // '2020-02-25T03:30Z'
    { id: '1', total: new BigNumber('16.24949857'), count: 4 },
    { id: '0', total: new BigNumber('0.83120001'), count: 2 })
  await put(
    'ETH-DFI', 1584210600000, // '2020-03-14T18:30Z'
    { id: '2', total: new BigNumber('38.34120795'), count: 4 },
    { id: '0', total: new BigNumber('0.00341235'), count: 1 })
  await put(
    'BTC-DFI', 1591587000000, // '2020-06-08T03:30Z'
    { id: '1', total: new BigNumber('6.43424635'), count: 15 },
    { id: '0', total: new BigNumber('12'), count: 5 })
  await put(
    'BTC-DFI', 1591587600000, // '2020-06-08T03:40Z'
    { id: '1', total: new BigNumber('12.56523127'), count: 7 },
    { id: '0', total: new BigNumber('9.87232'), count: 3 })
  await put(
    'BTC-DFI', 1591588200000, // '2020-06-08T03:50Z'
    { id: '1', total: new BigNumber('45.58974532'), count: 11 },
    { id: '0', total: new BigNumber('0.00923'), count: 1 })
  await put(
    'BTC-DFI', 1596498600000, // '2020-08-03T23:50Z'
    { id: '1', total: new BigNumber('56.341888563'), count: 34 },
    { id: '0', total: new BigNumber('23'), count: 24 })
  await put(
    'BTC-DFI', 1597872000000, // '2020-08-19T21:20Z'
    { id: '1', total: new BigNumber('78.23125745'), count: 56 },
    { id: '0', total: new BigNumber('46.58'), count: 28 })
  await put(
    'BTC-DFI', 1605442200000, // '2020-11-15T12:10Z'
    { id: '1', total: new BigNumber('14.45752346'), count: 8 },
    { id: '0', total: new BigNumber('32.3'), count: 10 })
}

describe('query', () => {
  beforeAll(async () => {
    // just need build once for query manipulation
    await setup()
  })

  it('should query', async () => {
    const from = '2020-02-15T00:00'
    const to = '2020-08-03T23:50'
    const aggregations = await mapper.query('BTC-DFI', 100, from, to)
    expect(aggregations.length).toStrictEqual(7)
    expect(aggregations[0].id).toStrictEqual('BTC-DFI_1596498600000')
    expect(aggregations[1].id).toStrictEqual('BTC-DFI_1591588200000')
    expect(aggregations[2].id).toStrictEqual('BTC-DFI_1591587600000')
    expect(aggregations[3].id).toStrictEqual('BTC-DFI_1591587000000')
    expect(aggregations[4].id).toStrictEqual('BTC-DFI_1582601400000')
    expect(aggregations[5].id).toStrictEqual('BTC-DFI_1582411200000')
    expect(aggregations[6].id).toStrictEqual('BTC-DFI_1581724800000')

    const ethAggregations = await mapper.query('ETH-DFI', 100, from, to)
    expect(ethAggregations.length).toStrictEqual(1)
  })

  it('should query with limit', async () => {
    const from = '2020-02-15T00:00'
    const to = '2020-08-03T23:50'
    const aggregations = await mapper.query('BTC-DFI', 3, from, to)
    expect(aggregations.length).toStrictEqual(3)
  })

  it('should get empty as out of range', async () => {
    const from = '1990-02-15T00:00'
    const to = '1990-08-03T23:50'
    const aggregations = await mapper.query('BTC-DFI', 100, from, to)
    expect(aggregations.length).toStrictEqual(0)
  })
})

describe('get', () => {
  it('should get', async () => {
    const aggregation = await mapper.get('BTC-DFI_1582411200000')
    if (aggregation === undefined) throw new Error()

    expect(aggregation.id).toStrictEqual('BTC-DFI_1582411200000')
    expect(aggregation.volume['1'].total).toStrictEqual('23.23000042')
    expect(aggregation.volume['1'].count).toStrictEqual(20)
    expect(aggregation.volume['0'].total).toStrictEqual('44.5523202')
    expect(aggregation.volume['0'].count).toStrictEqual(15)
  })

  it('should get undefined as getting non-existence data', async () => {
    const aggregation = await mapper.get('BTC-DFI_638954400000')
    expect(aggregation).toBeUndefined()
  })
})

describe('put', () => {
  it('should put', async () => {
    const aggregationBefore = await mapper.get('BTC-DFI_1597299600000')
    expect(aggregationBefore).toBeUndefined()

    await mapper.put({
      id: 'BTC-DFI_1597299600000',
      poolId: 'BTC-DFI',
      bucketId: 1597299600000,
      volume: {
        1: {
          total: new BigNumber('422.009734'),
          count: 98
        },
        0: {
          total: new BigNumber('192.12'),
          count: 87
        }
      }
    })

    const aggregationAfter = await mapper.get('BTC-DFI_1597299600000')
    if (aggregationAfter === undefined) throw new Error()
    expect(aggregationAfter.id).toStrictEqual('BTC-DFI_1597299600000')
    expect(aggregationAfter.poolId).toStrictEqual('BTC-DFI')
    expect(aggregationAfter.bucketId).toStrictEqual(1597299600000)
    expect(aggregationAfter.volume['1'].total).toStrictEqual('422.009734')
    expect(aggregationAfter.volume['1'].count).toStrictEqual(98)
    expect(aggregationAfter.volume['0'].total).toStrictEqual('192.12')
    expect(aggregationAfter.volume['0'].count).toStrictEqual(87)
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await mapper.put({
      id: 'BTC-DFI_1588800000000',
      poolId: 'BTC-DFI',
      bucketId: 1588800000000,
      volume: {
        1: {
          total: new BigNumber('36.56897456'),
          count: 41
        }
      }
    })

    const aggregationBefore = await mapper.get('BTC-DFI_1588800000000')
    if (aggregationBefore === undefined) throw new Error()
    expect(aggregationBefore.id).toStrictEqual('BTC-DFI_1588800000000')
    expect(aggregationBefore.poolId).toStrictEqual('BTC-DFI')
    expect(aggregationBefore.bucketId).toStrictEqual(1588800000000)
    expect(aggregationBefore.volume['1'].total).toStrictEqual('36.56897456')
    expect(aggregationBefore.volume['1'].count).toStrictEqual(41)

    await mapper.delete('BTC-DFI_1588800000000')

    const aggregationAfter = await mapper.get('BTC-DFI_1588800000000')
    expect(aggregationAfter).toBeUndefined()
  })
})
