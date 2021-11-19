import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { LoanTokenMapper } from '@src/module.model/loan.token'
import { LoanTokenHistoryMapper } from '@src/module.model/loan.token.history'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), [
    { token: 'AAPL', currency: 'EUR' },
    { token: 'AMZN', currency: 'USD' },
    { token: 'AMZG', currency: 'EUR' }
  ], { weightage: 1 })
  await container.generate(1)

  const ts = Math.floor(Date.now() / 1000)
  await client.oracle.setOracleData(oracleId, ts, {
    prices: [
      { tokenAmount: '1@AAPL', currency: 'EUR' },
      { tokenAmount: '2@AMZN', currency: 'USD' },
      { tokenAmount: '3@AMZG', currency: 'EUR' }
    ]
  })
  await container.generate(6)

  await client.loan.setLoanToken({
    symbol: 'AAPL',
    name: 'appol',
    fixedIntervalPriceId: 'AAPL/EUR',
    mintable: false,
    interest: new BigNumber(0.03)
  })
  const amznLoanTokenId = await client.loan.setLoanToken({
    symbol: 'AMZN',
    name: 'armazone',
    fixedIntervalPriceId: 'AMZN/USD',
    mintable: true,
    interest: new BigNumber(0.06)
  })
  // wait for few blocks before update, ensure invalidate find history correctly
  await container.generate(3)

  await client.loan.updateLoanToken(amznLoanTokenId, {
    symbol: 'AMZG',
    name: 'amazing',
    fixedIntervalPriceId: 'AMZG/EUR',
    mintable: false,
    interest: new BigNumber(0.06) // intentional keep the same
  })
  await container.generate(2)

  const height = await container.getBlockCount()
  await waitForIndexedHeight(app, height - 1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('created loan token', () => {
  it('should index tokens', async () => {
    // TODO(@ivan-zynesis): test case assertions WIP
    console.log(await app.get(LoanTokenMapper).query(100))
    const page1 = await app.get(LoanTokenHistoryMapper).queryAll(2)
    console.log(page1)
    const page2 = await app.get(LoanTokenHistoryMapper).queryAll(2, page1[1].loanTokenId)
    console.log(page2)
  })
})
