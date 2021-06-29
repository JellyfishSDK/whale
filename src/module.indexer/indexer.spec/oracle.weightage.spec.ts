import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleWeightageMapper } from '@src/module.model/oracle.weightage'

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
  await container.waitForWalletCoinbaseMaturity()
})

afterEach(async () => {
  const data = await container.call('listoracles')

  for (let i = 0; i < data.length; i += 1) {
    await container.call('removeoracle', [data[i]])
  }

  await container.generate(1)
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

describe('Weightage - approveOracle', () => {
  let oracleid: string
  let blockcount: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)
    blockcount = await client.blockchain.getBlockCount()
  }

  it('should get weightage', async () => {
    await setup()
    await waitForHeight(app, blockcount)

    const weightageMapper = app.get(OracleWeightageMapper)

    const weight = await weightageMapper.get(oracleid)
    expect(weight?.data.weightage).toStrictEqual(1)
  })
})

describe('Weightage - updateOracle', () => {
  let oracleid: string
  let blockcount: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
      priceFeeds,
      weightage: 2
    })

    await container.generate(1)

    blockcount = await client.blockchain.getBlockCount()
  }

  it('should get weightage', async () => {
    await setup()
    await waitForHeight(app, blockcount)

    const weightageMapper = app.get(OracleWeightageMapper)

    const weight = await weightageMapper.get(oracleid)
    expect(weight?.data.weightage).toStrictEqual(2)
  })
})

describe('Weightage - removeOracle', () => {
  let oracleid: string
  let blockcount: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    await client.oracle.removeOracle(oracleid)

    await container.generate(1)

    blockcount = await client.blockchain.getBlockCount()
  }

  it('should remove weightage', async () => {
    await setup()
    await waitForHeight(app, blockcount)

    const weightageMapper = app.get(OracleWeightageMapper)

    const weight = await weightageMapper.get(oracleid)
    expect(weight?.data.weightage).toStrictEqual(undefined)
  })
})
