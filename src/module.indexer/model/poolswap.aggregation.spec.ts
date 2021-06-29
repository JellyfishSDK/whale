// import { Database } from '@src/module.database/database'
// import { Test } from '@nestjs/testing'
// import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
// import { LevelDatabase } from '@src/module.database/provider.level/level.database'
// import { PoolSwapAggregationMapper, PoolSwapHourlyBucket } from '@src/module.model/poolswap.aggregation'
// import BigNumber from 'bignumber.js'

// let database: Database
// let mapper: PoolSwapAggregationMapper

// beforeAll(async () => {
//   const app = await Test.createTestingModule({
//     imports: [MemoryDatabaseModule],
//     providers: [PoolSwapAggregationMapper]
//   }).compile()

//   database = app.get<Database>(Database)
//   mapper = app.get<PoolSwapAggregationMapper>(PoolSwapAggregationMapper)
// })

// afterAll(async () => {
//   await (database as LevelDatabase).close()
// })

// beforeEach(async () => {
//   async function put (date: string, bucket: PoolSwapHourlyBucket): Promise<void> {
//     await mapper.put({
//       id: date,
//       bucket: {
//         0: { total: new BigNumber('0'), count: 0 },
//         1: { total: new BigNumber('0'), count: 0 },
//         2: { total: new BigNumber('0'), count: 0 },
//         3: { total: new BigNumber('0'), count: 0 },
//         4: { total: new BigNumber('0'), count: 0 },
//         5: { total: new BigNumber('0'), count: 0 },
//         6: { total: new BigNumber('0'), count: 0 },
//         7: { total: new BigNumber('0'), count: 0 },
//         8: { total: new BigNumber('0'), count: 0 },
//         9: { total: new BigNumber('0'), count: 0 },
//         10: { total: new BigNumber('0'), count: 0 },
//         11: { total: new BigNumber('0'), count: 0 },
//         12: { total: new BigNumber('0'), count: 0 },
//         13: { total: new BigNumber('0'), count: 0 },
//         14: { total: new BigNumber('0'), count: 0 },
//         15: { total: new BigNumber('0'), count: 0 },
//         16: { total: new BigNumber('0'), count: 0 },
//         17: { total: new BigNumber('0'), count: 0 },
//         18: { total: new BigNumber('0'), count: 0 },
//         19: { total: new BigNumber('0'), count: 0 },
//         20: { total: new BigNumber('0'), count: 0 },
//         21: { total: new BigNumber('0'), count: 0 },
//         22: { total: new BigNumber('0'), count: 0 },
//         23: { total: new BigNumber('0'), count: 0 },
//         ...bucket
//       }
//     })
//   }

//   await put('2020-02-09', { 0: { total: new BigNumber('2.20509127'), count: 1 } })
//   await put('2020-03-29', { 0: { total: new BigNumber('2.20509127'), count: 1 } })
//   await put('2020-04-01', {
//     10: { total: new BigNumber('2.20509127'), count: 1 },
//     13: { total: new BigNumber('8.82036508'), count: 4 },
//     21: { total: new BigNumber('4.41018254'), count: 2 }
//   })
// })

// describe('get', () => {
//   it('should get', async () => {
//     const aggregation = await mapper.get('2020-04-01')
//     if (aggregation === undefined) throw new Error()

//     expect(aggregation.id).toStrictEqual('2020-04-01')
//     expect(aggregation.bucket['10'].total).toStrictEqual('2.20509127')
//     expect(aggregation.bucket['10'].count).toStrictEqual(1)

//     expect(aggregation.bucket['13'].total).toStrictEqual(new BigNumber('2.20509127').times(4).toString())
//     expect(aggregation.bucket['13'].count).toStrictEqual(4)

//     expect(aggregation.bucket['21'].total).toStrictEqual(new BigNumber('2.20509127').times(2).toString())
//     expect(aggregation.bucket['21'].count).toStrictEqual(2)
//   })

//   it('should get undefined as getting non-existence data', async () => {
//     const aggregation = await mapper.get('1990-04-01')
//     expect(aggregation).toBeUndefined()
//   })
// })

// describe('put', () => {
//   it('should put', async () => {
//     const aggregationBefore = await mapper.get('2020-08-13')
//     expect(aggregationBefore).toBeUndefined()

//     await mapper.put({
//       id: '2020-08-13',
//       bucket: {
//         13: { total: new BigNumber('2.20509127'), count: 1 },
//         19: { total: new BigNumber('422.009734'), count: 6 }
//       }
//     })

//     const aggregationAfter = await mapper.get('2020-08-13')
//     if (aggregationAfter === undefined) throw new Error()
//     expect(aggregationAfter.id).toStrictEqual('2020-08-13')
//     expect(aggregationAfter.bucket['13']).toStrictEqual({ total: '2.20509127', count: 1 })
//     expect(aggregationAfter.bucket['19']).toStrictEqual({ total: '422.009734', count: 6 })
//   })
// })

// describe('delete', () => {
//   it('should delete', async () => {
//     await mapper.put({
//       id: '2020-08-18',
//       bucket: {
//         18: { total: new BigNumber('2.20509127'), count: 1 }
//       }
//     })

//     const aggregationBefore = await mapper.get('2020-08-18')
//     if (aggregationBefore === undefined) throw new Error()
//     expect(aggregationBefore.id).toStrictEqual('2020-08-18')
//     expect(aggregationBefore.bucket['18']).toStrictEqual({ total: '2.20509127', count: 1 })

//     await mapper.delete('2020-08-18')

//     const aggregationAfter = await mapper.get('2020-08-18')
//     expect(aggregationAfter).toBeUndefined()
//   })
// })
