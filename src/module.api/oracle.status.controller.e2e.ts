import { OracleStatusController } from '@src/module.api/oracle.status.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { OracleState } from '@whale-api-client/api/oracle'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: OracleStatusController

describe('getPriceFeed', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleStatusController)

    await setup()
  })

  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
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
  }

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get all price feeds by oracleId 5 blocks after the oracle was updated', async () => {
    await waitForIndexedHeight(app, height + 5)

    const result = await controller.getPriceFeedById(oracleId) ?? []

    expect(result[0]?.data.token).toStrictEqual('APPL')
    expect(result[0]?.data.currency).toStrictEqual('EUR')
    expect(result[0]?.state).toStrictEqual(OracleState.REMOVED)

    expect(result[1]?.data.token).toStrictEqual('TESL')
    expect(result[1]?.data.currency).toStrictEqual('USD')
    expect(result[1]?.state).toStrictEqual(OracleState.LIVE)
  })

  it('should return empty array if get price feed with invalid oracleId', async () => {
    await waitForIndexedHeight(app, height)

    const result = await controller.getPriceFeedById('invalid')

    expect(result).toStrictEqual([])
  })
})
