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

let oracleid1: string
let oracleid2: string
let blockcount: number

async function setup (): Promise<void> {
  await container.waitForWalletCoinbaseMaturity()

  const priceFeeds1 = [{ token: 'APPL', currency: 'EUR' }]
  oracleid1 = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds1, { weightage: 1 })

  const timestamp1 = Math.floor(new Date().getTime() / 1000 - 3300)
  const timestamp2 = Math.floor(new Date().getTime() / 1000 + 3300)

  const prices1 = [{ tokenAmount: '10.0@APPL', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid1, timestamp1, { prices: prices1 })

  await container.generate(1)

  const prices2 = [{ tokenAmount: '2.0@APPL', currency: 'EUR' }]
  await client.oracle.setOracleData(oracleid1, timestamp2, { prices: prices2 })

  await container.generate(1)

  const x = await container.call('listprices', [])
  console.log(x)

  await container.generate(1)
  blockcount = await client.blockchain.getBlockCount()
}

describe('x', () => {
  it('should wait for block height 1', async () => {
    await waitForHeight(app, blockcount)

    const weightageMapper = app.get(OracleWeightageMapper)

    let weight = await weightageMapper.get(oracleid1)
    expect(weight?.data.weightage).toStrictEqual(1)

    weight = await weightageMapper.get(oracleid2)
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
  //
  // it('should wait for block height 3', async () => {
  //   await waitForHeight(app, blockcount)
  //
  //   const priceAggregrationMapper = app.get(OraclePriceAggregrationMapper)
  //   const priceAggregation = await priceAggregrationMapper.get('APPL-EUR')
  //
  //   console.log(priceAggregation)
  // })
})
