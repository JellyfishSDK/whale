import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OracleAppointedWeightageMapper } from '@src/module.model/oracle.appointed.weightage'
import { OracleState } from '@whale-api-client/api/oracle'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

describe('Weightage - approveOracle', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(20)

    app = await createIndexerTestModule(container)
    await app.init()

    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    try {
      await stopIndexer(app)
    } finally {
      await container.stop()
    }
  })

  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'AAPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  it('should get weightage', async () => {
    await waitForHeight(app, height)

    const oracleAppointedWeightageMapper = app.get(OracleAppointedWeightageMapper)

    const result = await oracleAppointedWeightageMapper.get(oracleId, height)

    expect(result?.id).toStrictEqual(`${oracleId}-${height}`)
    expect(result?.block.height).toStrictEqual(height)
    expect(result?.data.oracleId).toStrictEqual(oracleId)
    expect(result?.data.weightage).toStrictEqual(1)
    expect(result?.state).toStrictEqual(OracleState.LIVE)

    const data = await container.call('getoracledata', [oracleId])

    expect(data?.weightage).toStrictEqual(1)
  })
})

describe('Weightage - updateOracle', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(20)

    app = await createIndexerTestModule(container)
    await app.init()

    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    try {
      await stopIndexer(app)
    } finally {
      await container.stop()
    }
  })

  let oracleId: string
  let height1: number
  let height2: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'AAPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get weightage', async () => {
    await waitForHeight(app, height2)

    const oracleAppointedWeightageMapper = app.get(OracleAppointedWeightageMapper)

    const result1 = await oracleAppointedWeightageMapper.get(oracleId, height1)

    expect(result1?.id).toStrictEqual(`${oracleId}-${height1}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.weightage).toStrictEqual(1)
    expect(result1?.state).toStrictEqual(OracleState.REMOVED)

    const result2 = await oracleAppointedWeightageMapper.get(oracleId, height2)

    expect(result2?.id).toStrictEqual(`${oracleId}-${height2}`)
    expect(result2?.block.height).toStrictEqual(height2)
    expect(result2?.data.oracleId).toStrictEqual(oracleId)
    expect(result2?.data.weightage).toStrictEqual(2)
    expect(result2?.state).toStrictEqual(OracleState.LIVE)

    const data = await container.call('getoracledata', [oracleId])

    expect(data?.weightage).toStrictEqual(2)
  })
})

describe('Weightage - removeOracle', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(20)

    app = await createIndexerTestModule(container)
    await app.init()

    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    try {
      await stopIndexer(app)
    } finally {
      await container.stop()
    }
  })

  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'AAPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')

    await container.call('removeoracle', [oracleId])

    await container.generate(1)
  }

  it('should remove weightage', async () => {
    await waitForHeight(app, height)

    const oracleAppointedWeightageMapper = app.get(OracleAppointedWeightageMapper)

    const result = await oracleAppointedWeightageMapper.get(oracleId, height)

    expect(result?.id).toStrictEqual(`${oracleId}-${height}`)
    expect(result?.block.height).toStrictEqual(height)
    expect(result?.data.oracleId).toStrictEqual(oracleId)
    expect(result?.data.weightage).toStrictEqual(1)
    expect(result?.state).toStrictEqual(OracleState.REMOVED)

    const promise = container.call('getoracledata', [oracleId])

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleId}> not found', code: -20`)
  })
})
