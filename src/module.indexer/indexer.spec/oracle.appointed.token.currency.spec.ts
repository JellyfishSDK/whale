import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { OracleAppointedTokenCurrencyMapper } from '@src/module.model/oracle.appointed.token.currency'
import { OracleState } from '@whale-api-client/api/oracle'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

describe('Token Currency - approveoracle', () => {
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
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  it('should get token currency', async () => {
    await waitForHeight(app, height)

    const appointedTokenCurrencyMapper = app.get(OracleAppointedTokenCurrencyMapper)

    const result = await appointedTokenCurrencyMapper.get(oracleId, 'AAPL', 'EUR', height)
    expect(result?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height}`)
    expect(result?.block.height).toStrictEqual(height)
    expect(result?.data.oracleId).toStrictEqual(oracleId)
    expect(result?.data.token).toStrictEqual('AAPL')
    expect(result?.data.currency).toStrictEqual('EUR')
    expect(result?.state).toStrictEqual(OracleState.LIVE)

    const data = await container.call('getoracledata', [oracleId])
    expect(data.priceFeeds).toStrictEqual(
      [
        { token: 'AAPL', currency: 'EUR' },
        { token: 'TSLA', currency: 'USD' }
      ]
    )
  })
})

describe('Token Currency - updateoracle', () => {
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
    const priceFeeds1 = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    const priceFeeds2 = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should get token currency', async () => {
    await waitForHeight(app, height2)

    const appointedTokenCurrencyMapper = app.get(OracleAppointedTokenCurrencyMapper)

    const result1 = await appointedTokenCurrencyMapper.get(oracleId, 'AAPL', 'EUR', height1)
    expect(result1?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height1}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.state).toStrictEqual(OracleState.LIVE)

    const result2 = await appointedTokenCurrencyMapper.get(oracleId, 'TSLA', 'USD', height1)
    expect(result2?.id).toStrictEqual(`${oracleId}-TSLA-USD-${height1}`)
    expect(result2?.block.height).toStrictEqual(height1)
    expect(result2?.data.oracleId).toStrictEqual(oracleId)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.state).toStrictEqual(OracleState.LIVE)

    const result3 = await appointedTokenCurrencyMapper.get(oracleId, 'FB', 'CNY', height2)
    expect(result3?.id).toStrictEqual(`${oracleId}-FB-CNY-${height2}`)
    expect(result3?.block.height).toStrictEqual(height2)
    expect(result3?.data.oracleId).toStrictEqual(oracleId)
    expect(result3?.data.token).toStrictEqual('FB')
    expect(result3?.data.currency).toStrictEqual('CNY')
    expect(result3?.state).toStrictEqual(OracleState.LIVE)

    const result4 = await appointedTokenCurrencyMapper.get(oracleId, 'MSFT', 'SGD', height2)
    expect(result4?.id).toStrictEqual(`${oracleId}-MSFT-SGD-${height2}`)
    expect(result4?.block.height).toStrictEqual(height2)
    expect(result4?.data.oracleId).toStrictEqual(oracleId)
    expect(result4?.data.token).toStrictEqual('MSFT')
    expect(result4?.data.currency).toStrictEqual('SGD')
    expect(result4?.state).toStrictEqual(OracleState.LIVE)

    const data = await container.call('getoracledata', [oracleId])
    expect(data.priceFeeds).toStrictEqual(
      [
        { token: 'FB', currency: 'CNY' },
        { token: 'MSFT', currency: 'SGD' }
      ]
    )
  })
})

describe('Token Currency - removeoracle', () => {
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
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    height1 = await container.call('getblockcount')

    await container.call('removeoracle', [oracleId])

    await container.generate(1)

    height2 = await container.call('getblockcount')
  }

  it('should remove token currency', async () => {
    await waitForHeight(app, height2)

    const appointedTokenCurrencyMapper = app.get(OracleAppointedTokenCurrencyMapper)

    const result1 = await appointedTokenCurrencyMapper.get(oracleId, 'AAPL', 'EUR', height1)
    expect(result1?.id).toStrictEqual(`${oracleId}-AAPL-EUR-${height1}`)
    expect(result1?.block.height).toStrictEqual(height1)
    expect(result1?.data.oracleId).toStrictEqual(oracleId)
    expect(result1?.data.token).toStrictEqual('AAPL')
    expect(result1?.data.currency).toStrictEqual('EUR')
    expect(result1?.state).toStrictEqual(OracleState.REMOVED)

    const result2 = await appointedTokenCurrencyMapper.get(oracleId, 'TSLA', 'USD', height1)
    expect(result2?.id).toStrictEqual(`${oracleId}-TSLA-USD-${height1}`)
    expect(result2?.block.height).toStrictEqual(height1)
    expect(result2?.data.oracleId).toStrictEqual(oracleId)
    expect(result2?.data.token).toStrictEqual('TSLA')
    expect(result2?.data.currency).toStrictEqual('USD')
    expect(result2?.state).toStrictEqual(OracleState.REMOVED)

    const promise = container.call('getoracledata', [oracleId])
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleId}> not found', code: -20`)
  })
})
