import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OracleState } from '@whale-api-client/api/oracle'
import { OracleAppointedMapper } from '@src/module.model/oracle.appointed'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()

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
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  it('should get weightage', async () => {
    await setup()
    await waitForHeight(app, height)

    const oracleStatusMapper = app.get(OracleAppointedMapper)

    const data1 = await oracleStatusMapper.get(oracleId, height)
    expect(data1?.data.weightage).toStrictEqual(1)
    expect(data1?.state).toStrictEqual(OracleState.LIVE)

    const data2 = await container.call('getoracledata', [oracleId])
    expect(data2?.weightage).toStrictEqual(1)
  })
})

describe('Weightage - updateOracle', () => {
  let oracleId: string
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get weightage', async () => {
    await setup()
    await waitForHeight(app, height2)

    const oracleStatusMapper = app.get(OracleAppointedMapper)

    const data1 = await oracleStatusMapper.get(oracleId, height1)
    expect(data1?.data.weightage).toStrictEqual(1)
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const data2 = await oracleStatusMapper.get(oracleId, height2)
    expect(data2?.data.weightage).toStrictEqual(2)
    expect(data2?.state).toStrictEqual(OracleState.LIVE)

    const data3 = await container.call('getoracledata', [oracleId])
    expect(data3?.weightage).toStrictEqual(2)
  })
})

describe('Weightage - removeOracle', () => {
  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')

    await container.call('removeoracle', [oracleId])

    await container.generate(1)
  }

  it('should remove weightage', async () => {
    await setup()
    await waitForHeight(app, height)

    const oracleStatusMapper = app.get(OracleAppointedMapper)

    const data1 = await oracleStatusMapper.get(oracleId, height)
    expect(data1?.state).toStrictEqual(OracleState.REMOVED)

    const promise = container.call('getoracledata', [oracleId])
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleId}> not found', code: -20`)
  })
})
