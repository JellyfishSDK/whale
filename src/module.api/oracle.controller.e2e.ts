import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { OracleController } from '@src/module.api/oracle.controller'
import { OracleState } from '@whale-api-client/api/oracle'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: OracleController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  controller = app.get(OracleController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('Status', () => {
  let oracleId: string
  let height: number

  beforeAll(async () => {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    height = await container.call('getblockcount')
  })

  it('should getStatus 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getStatus(oracleId)
    expect(result?.data.weightage).toStrictEqual(2)
  })

  it('should return undefined if getStatus with invalid id', async () => {
    await waitForIndexedHeight(app, height)

    const result = await controller.getStatus('invalid')
    expect(result).toStrictEqual(undefined)
  })
})

describe('Price feed', () => {
  describe('Get all price feeds', () => {
    let height: number

    beforeAll(async () => {
      const priceFeeds1 = [
        { token: 'APPL', currency: 'EUR' },
        { token: 'FB', currency: 'CNY' }
      ]

      await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

      await container.generate(1)

      const priceFeeds2 = [
        { token: 'MSFT', currency: 'SGD' },
        { token: 'TESL', currency: 'USD' }
      ]

      await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 1])

      await container.generate(1)

      height = await container.call('getblockcount')
    })

    it('should get all price feeds 5 blocks after the oracle was updated', async () => {
      await waitForIndexedHeight(app, height + 5)

      const result = await controller.getPriceFeeds() ?? []

      // Result sort by Token, Currency and block height
      expect(result[0]?.data.token).toStrictEqual('APPL')
      expect(result[0]?.data.currency).toStrictEqual('EUR')

      expect(result[1]?.data.token).toStrictEqual('FB')
      expect(result[1]?.data.currency).toStrictEqual('CNY')

      expect(result[2]?.data.token).toStrictEqual('MSFT')
      expect(result[2]?.data.currency).toStrictEqual('SGD')

      expect(result[3]?.data.token).toStrictEqual('TESL')
      expect(result[3]?.data.currency).toStrictEqual('USD')
    })
  })

  describe('Get price feeds for an oracle', () => {
    let oracleId: string
    let height: number

    beforeAll(async () => {
      const priceFeeds1 = [
        { token: 'APPL', currency: 'EUR' }
      ]
      oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

      await container.generate(1)

      const priceFeeds2 = [
        { token: 'TESL', currency: 'USD' }
      ]

      await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds2, 2])

      await container.generate(1)

      height = await container.call('getblockcount')
    })

    it('should get all price feeds by oracleId 5 blocks after the oracle was updated', async () => {
      await waitForIndexedHeight(app, height + 5)

      const result = await controller.getPriceFeed(oracleId) ?? []

      expect(result[0]?.data.token).toStrictEqual('APPL')
      expect(result[0]?.data.currency).toStrictEqual('EUR')
      expect(result[0]?.state).toStrictEqual(OracleState.REMOVED)

      expect(result[1]?.data.token).toStrictEqual('TESL')
      expect(result[1]?.data.currency).toStrictEqual('USD')
      expect(result[1]?.state).toStrictEqual(OracleState.LIVE)
    })

    it('should return empty array if get price feed with invalid oracleId', async () => {
      await waitForIndexedHeight(app, height)

      const result = await controller.getPriceFeed('invalid')

      expect(result).toStrictEqual([])
    })
  })
})

describe('Price Data', () => {
  let oracleId: string
  let height: number
  let timestamp: number

  beforeAll(async () => {
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)

    const prices = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' },
      { tokenAmount: '1.0@TESL', currency: 'USD' }
    ]

    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    height = await container.call('getblockcount')
  })

  it('should get price data by oracleId 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPriceData(oracleId) ?? []
    expect(result.length).toStrictEqual(2)

    expect(result[0]?.data.oracleId).toStrictEqual(oracleId)
    expect(result[0]?.data.token).toStrictEqual('APPL')
    expect(result[0]?.data.currency).toStrictEqual('EUR')
    expect(result[0]?.data.amount).toStrictEqual('0.5')
    expect(result[0]?.data.timestamp).toStrictEqual(timestamp)
    expect(result[0]?.state).toStrictEqual(OracleState.LIVE)

    expect(result[1]?.data.oracleId).toStrictEqual(oracleId)
    expect(result[1]?.data.token).toStrictEqual('TESL')
    expect(result[1]?.data.currency).toStrictEqual('USD')
    expect(result[1]?.data.amount).toStrictEqual('1')
    expect(result[1]?.data.timestamp).toStrictEqual(timestamp)
    expect(result[1]?.state).toStrictEqual(OracleState.LIVE)
  })

  it('should return empty array if get price data with invalid oracleId', async () => {
    await waitForIndexedHeight(app, height)

    const result = await controller.getPriceData('invalid')

    expect(result).toStrictEqual([])
  })
})

describe('Price', () => {
  let height: number

  beforeAll(async () => {
    const priceFeeds = [
      { token: 'APPL', currency: 'EUR' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    await container.generate(1)

    const prices2 = [
      { tokenAmount: '0.5@APPL', currency: 'EUR' }
    ]

    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    height = await container.call('getblockcount')
  })

  it('should get latest token and currency 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPrice('APPL', 'EUR')

    expect(result?.data.token).toStrictEqual('APPL')
    expect(result?.data.currency).toStrictEqual('EUR')
    expect(result?.data.amount).toStrictEqual(0.5)
  })

  it('should return undefined if get price data with invalid token and currency', async () => {
    await waitForIndexedHeight(app, height)

    const result = await controller.getPrice('invalid', 'invalid')

    expect(result).toStrictEqual(undefined)
  })
})
