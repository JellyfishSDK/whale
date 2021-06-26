import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { getDateInString } from '@src/utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

function generateBlock (timestamp: number): any {
  const dummyScriptPubKey = {
    // https://mainnet.defichain.io/#/DFI/mainnet/tx/700473ec7ca4f6bec261e75342f91825f3c2cf60df1bf1f335b53a2bcd95b994
    // fromAmount: 2.20509127
    asm: 'OP_RETURN 446654787317a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f',
    hex: '6a4c4f446654787317a9140806eb42b6d5bb69726909fb6da34a9152afdf048701c7b3240d0000000017a9140806eb42b6d5bb69726909fb6da34a9152afdf048700ffffffffffffff7fffffffffffffff7f'
  }

  return {
    hash: randomString(),
    height: 1,
    tx: [{
      txid: randomString(),
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

function randomString (): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  var result = ''
  for (var i = 64; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

function generateTs (
  year: number = 0, month: number = 1, date: number = 0,
  hours: number = 0, minutes: number = 0, seconds: number = 0
): number {
  return new Date(Date.UTC(year, month - 1, date, hours, minutes, seconds)).valueOf() / 1000
}

it('should query by date range', async () => {
  const client = app.get(JsonRpcClient)

  const spy = jest.spyOn(client.blockchain, 'getBlock')
    .mockImplementationOnce(() => generateBlock(generateTs(2021, 2, 15, 14, 14, 14)))
    .mockImplementationOnce(() => generateBlock(generateTs(2021, 2, 15, 14, 30, 39)))
    .mockImplementationOnce(() => generateBlock(generateTs(2021, 3, 29, 4, 50, 14)))

  await waitForHeight(app, 20)

  const aggregationMapper = app.get(PoolSwapAggregationMapper)

  const from = getDateInString(2021, 0, 1)
  const to = getDateInString(2021, 8, 31)

  const aggregations = await aggregationMapper.query(100, from, to)
  // console.log('aggregations: ', aggregations)
  // expect(aggregations.length).toStrictEqual(1)
  for (let i = 0; i < aggregations.length; i += 1) {
    const aggregation = aggregations[i]
    for (const hour in aggregation.bucket) {
      const bucket = aggregation.bucket[hour]
      if (bucket.count !== 0) {
        console.log('bucket: ', aggregation.id, hour, bucket)
        // expect(bucket.total).toStrictEqual('229.39044111')
        // expect(bucket.count).toStrictEqual(3)
      }
    }
  }

  spy.mockRestore()
})
