import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleWeightageAggregationMapper } from '@src/module.model/oracle.weightage.aggregation'
import { OraclePriceAggregationMapper } from '@src/module.model/oracle.price.aggregation'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()

  client = new JsonRpcClient(await container.getCachedRpcUrl())
  await setup()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

let oracleid: string
let blockcount0: number
let blockcount1: number
let blockcount2: number

async function setup (): Promise<void> {
  await container.waitForWalletCoinbaseMaturity()

  const priceFeeds = [
    { token: 'APPLE', currency: 'EUR' }
  ]

  oracleid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

  await container.generate(1)
  blockcount0 = await client.blockchain.getBlockCount()

  await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
    priceFeeds,
    weightage: 2
  })

  await container.generate(1)
  blockcount1 = await client.blockchain.getBlockCount()

  const timestamp = new Date().getTime()
  const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid, timestamp, { prices })

  await container.generate(1)
  blockcount2 = await client.blockchain.getBlockCount()
}

describe('x', () => {
  it('should wait for block height 0', async () => {
    await waitForHeight(app, blockcount0)

    const weightageAggregationMapper = app.get(OracleWeightageAggregationMapper)

    const weightAggregation = await weightageAggregationMapper.get(oracleid, blockcount0)

    expect(weightAggregation?.data.oracleid).toStrictEqual(oracleid)
    expect(weightAggregation?.data.weightage).toStrictEqual(1)
  })

  it('should wait for block height 1', async () => {
    await waitForHeight(app, blockcount1)

    const weightageAggregationMapper = app.get(OracleWeightageAggregationMapper)

    const weightAggregation = await weightageAggregationMapper.get(oracleid, blockcount1)

    expect(weightAggregation?.data.oracleid).toStrictEqual(oracleid)
    expect(weightAggregation?.data.weightage).toStrictEqual(2)
  })

  it('should wait for block height 2', async () => {
    await waitForHeight(app, blockcount2)

    const priceAggregationMapper = app.get(OraclePriceAggregationMapper)

    const priceAggregation = await priceAggregationMapper.get('APPLE', 'EUR', blockcount2)

    expect(priceAggregation?.data.token).toStrictEqual('APPLE')
    expect(priceAggregation?.data.currency).toStrictEqual('EUR')
  })
})
