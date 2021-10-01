import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanMasterNodeRegTestContainer } from '@src/module.api/loan_container'
// import { LoanController } from '@src/module.api/loan.controller'
// import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
// let controller: LoanController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  await waitForIndexedHeight(app, 100)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})
