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
  async function put (poolId: string, bucketId: number, total: BigNumber, count: number): Promise<void> {
    await mapper.put({
      id: `${poolId}_${bucketId}`,
      poolId: poolId,
      bucketId: bucketId,
      total: total,
      count: count
    })
  }

  await put('BTC-DFI', 1581724800000, new BigNumber('2.20509127'), 1) // '2020-02-15T00:00Z'
  await put('BTC-DFI', 1582411200000, new BigNumber('23.23000042'), 20) // '2020-02-22T22:40Z'
  await put('BTC-DFI', 1582601400000, new BigNumber('16.24949857'), 4) // '2020-02-25T03:30Z'
  await put('ETH-DFI', 1584210600000, new BigNumber('38.34120795'), 4) // '2020-03-14T18:30Z'
  await put('BTC-DFI', 1591587000000, new BigNumber('6.43424635'), 15) // '2020-06-08T03:30Z'
  await put('BTC-DFI', 1591587600000, new BigNumber('12.56523127'), 7) // '2020-06-08T03:40Z'
  await put('BTC-DFI', 1591588200000, new BigNumber('45.58974532'), 11) // '2020-06-08T03:50Z'
  await put('BTC-DFI', 1596498600000, new BigNumber('56.341888563'), 34) // '2020-08-03T23:50Z'
  await put('BTC-DFI', 1597872000000, new BigNumber('78.23125745'), 56) // '2020-08-19T21:20Z'
  await put('BTC-DFI', 1605442200000, new BigNumber('14.45752346'), 8) // '2020-11-15T12:10Z'
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
    expect(aggregation.total).toStrictEqual('23.23000042')
    expect(aggregation.count).toStrictEqual(20)
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
      total: new BigNumber('422.009734'),
      count: 98
    })

    const aggregationAfter = await mapper.get('BTC-DFI_1597299600000')
    if (aggregationAfter === undefined) throw new Error()
    expect(aggregationAfter.id).toStrictEqual('BTC-DFI_1597299600000')
    expect(aggregationAfter.poolId).toStrictEqual('BTC-DFI')
    expect(aggregationAfter.bucketId).toStrictEqual(1597299600000)
    expect(aggregationAfter.total).toStrictEqual('422.009734')
    expect(aggregationAfter.count).toStrictEqual(98)
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await mapper.put({
      id: 'BTC-DFI_1588800000000',
      poolId: 'BTC-DFI',
      bucketId: 1588800000000,
      total: new BigNumber('36.56897456'),
      count: 41
    })

    const aggregationBefore = await mapper.get('BTC-DFI_1588800000000')
    if (aggregationBefore === undefined) throw new Error()
    expect(aggregationBefore.id).toStrictEqual('BTC-DFI_1588800000000')
    expect(aggregationBefore.poolId).toStrictEqual('BTC-DFI')
    expect(aggregationBefore.bucketId).toStrictEqual(1588800000000)
    expect(aggregationBefore.total).toStrictEqual('36.56897456')
    expect(aggregationBefore.count).toStrictEqual(41)

    await mapper.delete('BTC-DFI_1588800000000')

    const aggregationAfter = await mapper.get('BTC-DFI_1588800000000')
    expect(aggregationAfter).toBeUndefined()
  })
})
