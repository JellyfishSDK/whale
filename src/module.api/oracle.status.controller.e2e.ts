import { OracleStatusController } from '@src/module.api/oracle.status.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: OracleStatusController
let client: JsonRpcClient

describe('getStatus', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    controller = app.get(OracleStatusController)
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    await setup()
  })

  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
    oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds,
      weightage: 2
    })

    await container.generate(1)

    height = await client.blockchain.getBlockCount()
  }

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  describe('getStatus', () => {
    it('should getStatus', async () => {
      await waitForIndexedHeight(app, height)

      const result = await controller.getStatus(oracleId)
      expect(result?.data.weightage).toStrictEqual(2)
    })

    it('should return undefined if getStatus with invalid id', async () => {
      await waitForIndexedHeight(app, height)

      const result = await controller.getStatus('invalid')

      expect(result).toStrictEqual(undefined)
    })
  })
})
