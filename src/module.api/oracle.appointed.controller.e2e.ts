import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { OracleAppointedController } from '@src/module.api/oracle.appointed.controller'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: OracleAppointedController

describe('getStatus', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleAppointedController)

    await setup()
  })

  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  afterAll(async () => {
    await stopTestingApp(container, app)
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
