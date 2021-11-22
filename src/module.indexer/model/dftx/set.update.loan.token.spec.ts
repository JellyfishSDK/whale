import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { LoanTokenMapper } from '@src/module.model/loan.token'
import { LoanTokenHistoryMapper } from '@src/module.model/loan.token.history'
import { TokenMapper } from '@src/module.model/token'

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
  await container.generate(1)
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
    interest: new BigNumber(0.08) // intentional keep the same
  })
  await container.generate(2)

  const height = await container.getBlockCount()
  await waitForIndexedHeight(app, height - 1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('token', () => {
  it('should create/update normal token', async () => {
    const tokens = await app.get(TokenMapper).query(100)
    const aapl = tokens.find(t => t.symbol === 'AAPL')

    expect(aapl).toBeDefined()
    expect(aapl?.symbol).toStrictEqual('AAPL')
    expect(aapl?.name).toStrictEqual('appol')
    expect(aapl?.mintable).toStrictEqual(false)

    const amzn = tokens.find(t => t.symbol === 'AMZG')
    expect(amzn).toBeDefined()
    expect(amzn?.symbol).toStrictEqual('AMZG')
    expect(amzn?.name).toStrictEqual('amazing')
    expect(amzn?.mintable).toStrictEqual(false) // updated by updateLoanToken
  })
})

describe('loan token', () => {
  it('each loan token should be unique', async () => {
    const tokens = await app.get(TokenMapper).query(100)
    const aaplT = tokens.find(t => t.symbol === 'AAPL')
    const amznT = tokens.find(t => t.symbol === 'AMZG')

    const loanTokens = await app.get(LoanTokenMapper).query(100)
    expect(loanTokens.length).toStrictEqual(2)
    const amzn = loanTokens.find(lt => lt.tokenId === amznT?.id)
    const aapl = loanTokens.find(lt => lt.tokenId === aaplT?.id)

    expect(amzn).toBeDefined()
    expect(amzn?.interest).toStrictEqual('0.08') // latest value
    expect(amzn?.tokenCurrency).toStrictEqual('AMZG-EUR') // latest value
    expect(amzn?.tokenId).toStrictEqual('2')
    expect(amzn?.block).toBeDefined()
    expect(amzn?.block.height).toStrictEqual(110)

    expect(aapl).toBeDefined()
    expect(aapl?.interest).toStrictEqual('0.03')
    expect(aapl?.tokenCurrency).toStrictEqual('AAPL-EUR')
    expect(aapl?.tokenId).toStrictEqual('1')
    expect(aapl?.block).toBeDefined()
    expect(aapl?.block.height).toStrictEqual(109)
  })
})

describe('loan token history', () => {
  it('should index without partition (query without filter)', async () => {
    const allHistory = await app.get(LoanTokenHistoryMapper).queryAll(100)
    expect(allHistory.length).toStrictEqual(3)

    const [one, two, three] = allHistory

    const page1 = await app.get(LoanTokenHistoryMapper).queryAll(2)
    expect(page1.length).toStrictEqual(2)
    expect(page1[0]).toStrictEqual(one)
    expect(one.symbol).toStrictEqual('AMZG')
    expect(one.name).toStrictEqual('amazing')
    expect(one.interest).toStrictEqual('0.08')
    expect(one.tokenCurrency).toStrictEqual('AMZG-EUR')
    expect(one.block).toBeDefined()
    expect(one.block.height).toStrictEqual(113)

    expect(page1[1]).toStrictEqual(two)
    expect(two.symbol).toStrictEqual('AMZN')
    expect(two.name).toStrictEqual('armazone')
    expect(two.interest).toStrictEqual('0.06')
    expect(two.tokenCurrency).toStrictEqual('AMZN-USD')
    expect(two.block).toBeDefined()
    expect(two.block.height).toStrictEqual(110)

    const page2 = await app.get(LoanTokenHistoryMapper).queryAll(2, page1[1].id)
    expect(page2.length).toStrictEqual(1)
    expect(page2[0]).toStrictEqual(three)
    expect(three.symbol).toStrictEqual('AAPL')
    expect(three.name).toStrictEqual('appol')
    expect(three.interest).toStrictEqual('0.03')
    expect(three.tokenCurrency).toStrictEqual('AAPL-EUR')
    expect(three.block).toBeDefined()
    expect(three.block.height).toStrictEqual(109)
  })

  it('should index and partitioned by loanTokenId', async () => {
    const tokens = await app.get(TokenMapper).query(100)
    const aaplT = tokens.find(t => t.symbol === 'AAPL')
    const amznT = tokens.find(t => t.symbol === 'AMZG')

    const loanTokens = await app.get(LoanTokenMapper).query(100)
    expect(loanTokens.length).toStrictEqual(2)
    const aapl = loanTokens.find(lt => lt.tokenId === aaplT?.id)
    expect(aapl).toBeDefined()
    const amzn = loanTokens.find(lt => lt.tokenId === amznT?.id)
    expect(amzn).toBeDefined()

    const aaplHistory = await app.get(LoanTokenHistoryMapper).query(aapl?.id as string, 100)
    expect(aaplHistory.length).toStrictEqual(1)
    expect(aaplHistory[0].symbol).toStrictEqual('AAPL')
    expect(aaplHistory[0].name).toStrictEqual('appol')
    expect(aaplHistory[0].interest).toStrictEqual('0.03')
    expect(aaplHistory[0].tokenCurrency).toStrictEqual('AAPL-EUR')
    expect(aaplHistory[0].block).toBeDefined()
    expect(aaplHistory[0].block.height).toStrictEqual(109)

    const amznHistory = await app.get(LoanTokenHistoryMapper).query(amzn?.id as string, 100)
    expect(amznHistory.length).toStrictEqual(2)
    expect(amznHistory[0].symbol).toStrictEqual('AMZG')
    expect(amznHistory[0].name).toStrictEqual('amazing')
    expect(amznHistory[0].interest).toStrictEqual('0.08')
    expect(amznHistory[0].tokenCurrency).toStrictEqual('AMZG-EUR')
    expect(amznHistory[0].block).toBeDefined()
    expect(amznHistory[0].block.height).toStrictEqual(113)
    expect(amznHistory[1].symbol).toStrictEqual('AMZN')
    expect(amznHistory[1].name).toStrictEqual('armazone')
    expect(amznHistory[1].interest).toStrictEqual('0.06')
    expect(amznHistory[1].tokenCurrency).toStrictEqual('AMZN-USD')
    expect(amznHistory[1].block).toBeDefined()
    expect(amznHistory[1].block.height).toStrictEqual(110)
  })
})
