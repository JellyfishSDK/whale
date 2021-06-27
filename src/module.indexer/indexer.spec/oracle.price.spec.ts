import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleWeightageMapper } from '@src/module.model/oracle.weightage'
import { OraclePriceMapper } from '@src/module.model/oracle.price'
import { OraclePriceAggregrationMapper } from '@src/module.model/oracle.price.aggregration'

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

let oracleid1: string
let oracleid2: string
let blockcount: number

async function setup (): Promise<void> {
  await container.waitForWalletCoinbaseMaturity()

  const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]

  oracleid1 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

  await container.generate(1)

  oracleid2 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 2 })

  await container.generate(1)

  await client.oracle.updateOracle(oracleid2, await container.getNewAddress(), {
    priceFeeds,
    weightage: 3
  })

  await container.generate(1)

  const timestamp = new Date().getTime()

  const prices1 = [{ tokenAmount: '0.5@APPL', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid1, timestamp, { prices: prices1 })

  await container.generate(1)

  const prices2 = [{ tokenAmount: '1.0@APPL', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid2, timestamp, { prices: prices2 })

  await container.generate(1)
  blockcount = await client.blockchain.getBlockCount()
}

describe('x', () => {
  it('should wait for block height 1', async () => {
    await waitForHeight(app, blockcount)

    const weightageMapper = app.get(OracleWeightageMapper)

    let weight = await weightageMapper.get(oracleid1)
    expect(weight?.data.oracleid).toStrictEqual(oracleid1)
    expect(weight?.data.weightage).toStrictEqual(1)

    weight = await weightageMapper.get(oracleid2)
    expect(weight?.data.oracleid).toStrictEqual(oracleid2)
    expect(weight?.data.weightage).toStrictEqual(3)

    const priceMapper = app.get(OraclePriceMapper)

    let price = await priceMapper.get(`${oracleid1}-APPL-EUR`)
    expect(price?.data.oracleid).toStrictEqual(oracleid1)
    expect(price?.data.token).toStrictEqual('APPL')
    expect(price?.data.currency).toStrictEqual('EUR')
    expect(price?.data.amount).toStrictEqual('0.5')

    price = await priceMapper.get(`${oracleid2}-APPL-EUR`)
    expect(price?.data.oracleid).toStrictEqual(oracleid2)
    expect(price?.data.token).toStrictEqual('APPL')
    expect(price?.data.currency).toStrictEqual('EUR')
    expect(price?.data.amount).toStrictEqual('1')
  })

  it('should wait for block height 3', async () => {
    await waitForHeight(app, blockcount)

    const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)
    const priceAggregation = await priceAggregrationMapper.get('APPL-EUR')

    console.log(priceAggregation)
  })
})
