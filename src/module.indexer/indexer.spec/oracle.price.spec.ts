import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleWeightageMapper } from '@src/module.model/oracle.weightage'
import { OraclePriceMapper } from '@src/module.model/oracle.price'

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

  //  await container.generate(1)
  blockcount0 = await client.blockchain.getBlockCount()

  await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
    priceFeeds,
    weightage: 2
  })

  // await container.generate(1)
  blockcount1 = await client.blockchain.getBlockCount()

  const timestamp = new Date().getTime()
  const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid, timestamp, { prices })

  // await container.generate(1)
  blockcount2 = await client.blockchain.getBlockCount()
}

describe('x', () => {
  it('should wait for block height 0', async () => {
    await waitForHeight(app, blockcount0)

    const weightageAggregationMapper = app.get(OracleWeightageMapper)

    const weightAggregation = await weightageAggregationMapper.get(oracleid)

    expect(weightAggregation?.block.height).toStrictEqual(blockcount0)
    expect(weightAggregation?.data.weightage).toStrictEqual(1)
  })

  it('should wait for block height 1', async () => {
    await waitForHeight(app, blockcount1)

    const weightageAggregationMapper = app.get(OracleWeightageMapper)

    const weightAggregation = await weightageAggregationMapper.get(oracleid)

    expect(weightAggregation?.block.height).toStrictEqual(blockcount1)
    expect(weightAggregation?.data.weightage).toStrictEqual(2)
  })

  it('should wait for block height 2', async () => {
    await waitForHeight(app, blockcount2)

    const priceAggregationMapper = app.get(OraclePriceMapper)

    const priceAggregation = await priceAggregationMapper.get(`${blockcount2}}-${oracleid}-APPLE-EUR`)

    const info = await client.blockchain.getBlockchainInfo()
    const hash = await client.blockchain.getBlockHash(info.blocks)
    const block = await client.blockchain.getBlock(hash, 1)

    expect(priceAggregation?.data.timestamp).toStrictEqual(block.time)
    expect(priceAggregation?.data.oracleid).toStrictEqual(oracleid)
    expect(priceAggregation?.data.token).toStrictEqual('APPLE')
    expect(priceAggregation?.data.currency).toStrictEqual('EUR')
    expect(priceAggregation?.data.price).toStrictEqual(0.5)
  })
})
