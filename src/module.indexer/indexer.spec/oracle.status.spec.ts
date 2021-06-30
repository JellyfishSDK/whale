import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleStatusMapper } from '@src/module.model/oracle.status'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { OracleState } from '@whale-api-client/api/oracle'

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
  let oracleId: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)
    blockCount = await client.blockchain.getBlockCount()
  }

  it('should get weightage', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const oracleStatusMapper = app.get(OracleStatusMapper)

    const data1 = await oracleStatusMapper.get(oracleId)
    expect(data1?.data.weightage).toStrictEqual(1)
    expect(data1?.state).toStrictEqual(OracleState.LIVE)

    const data2 = await client.oracle.getOracleData(oracleId)

    expect(data2?.weightage).toStrictEqual(1)
  })
})

describe('Weightage - updateOracle', () => {
  let oracleId: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds,
      weightage: 2
    })

    await container.generate(1)

    blockCount = await client.blockchain.getBlockCount()
  }

  it('should get weightage', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const oracleStatusMapper = app.get(OracleStatusMapper)

    const data1 = await oracleStatusMapper.get(oracleId)
    expect(data1?.data.weightage).toStrictEqual(2)
    expect(data1?.state).toStrictEqual(OracleState.LIVE)

    const data2 = await client.oracle.getOracleData(oracleId)

    expect(data2?.weightage).toStrictEqual(2)
  })
})

describe('Weightage - removeOracle', () => {
  let oracleId: string
  let blockCount: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    await client.oracle.removeOracle(oracleId)

    await container.generate(1)

    blockCount = await client.blockchain.getBlockCount()
  }

  it('should remove weightage', async () => {
    await setup()
    await waitForHeight(app, blockCount)

    const oracleStatusMapper = app.get(OracleStatusMapper)

    const data1 = await oracleStatusMapper.get(oracleId)
    expect(data1?.data.weightage).toStrictEqual(0)
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const promise = client.oracle.getOracleData(oracleId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'oracle <${oracleId}> not found', code: -20, method: getoracledata`)
  })
})
