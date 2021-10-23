import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from '@src/module.api/loan_container'
import { LoanTokenController } from '@src/module.api/loan.token.controller'
import { Testing } from '@defichain/jellyfish-testing'
import { NotFoundException } from '@nestjs/common'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanTokenController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanTokenController)

  const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' }
  ], 1])
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1.5@AAPL', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2.5@TSLA', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3.5@MSFT', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '4.5@FB', currency: 'USD' }] })
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD',
    mintable: false,
    interest: new BigNumber(0.01)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD',
    mintable: false,
    interest: new BigNumber(0.02)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD',
    mintable: false,
    interest: new BigNumber(0.03)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD',
    mintable: false,
    interest: new BigNumber(0.04)
  }])
  await testing.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('loan', () => {
  it('should listLoanTokens', async () => {
    const result = await controller.list({ size: 100 })
    console.log(result)
    expect(result.data.length).toStrictEqual(4)
    expect(result.data[0].symbol).toStrictEqual('AAPL')
    expect(result.data[0]).toStrictEqual({
      collateralAddress: expect.any(String),
      creation: {
        height: expect.any(Number),
        tx: expect.any(String)
      },
      decimal: 8,
      destruction: {
        height: expect.any(Number),
        tx: expect.any(String)
      },
      displaySymbol: 'dAAPL',
      finalized: false,
      id: expect.any(String),
      interest: new BigNumber(0.01),
      isDAT: true,
      isLPS: false,
      limit: '0',
      mintable: false,
      minted: '0',
      name: '',
      fixedIntervalPriceId: 'AAPL/USD',
      symbol: 'AAPL',
      symbolKey: 'AAPL',
      tokenId: '1',
      tradeable: true
    })

    expect(result.data[1].symbol).toStrictEqual('TSLA')
    expect(result.data[2].symbol).toStrictEqual('MSFT')
    expect(result.data[3].symbol).toStrictEqual('FB')
  })

  it('should listLoanTokens with pagination', async () => {
    const first = await controller.list({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')

    expect(first.data[0].tokenId).toStrictEqual('1')
    expect(first.data[1].tokenId).toStrictEqual('2')

    const next = await controller.list({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('4')

    expect(next.data[0].tokenId).toStrictEqual('3')
    expect(next.data[1].tokenId).toStrictEqual('4')

    const last = await controller.list({
      size: 2,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listLoanTokens with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.list({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get scheme by symbol', async () => {
    const data = await controller.get('AAPL')
    expect(data.token[1].symbol).toStrictEqual('AAPL')
    expect(data.token[1]).toStrictEqual({
      collateralAddress: expect.any(String),
      creation: {
        height: expect.any(Number),
        tx: expect.any(String)
      },
      decimal: 8,
      destruction: {
        height: expect.any(Number),
        tx: expect.any(String)
      },
      displaySymbol: 'dAAPL',
      finalized: false,
      id: expect.any(String),
      interest: new BigNumber(0.01),
      isDAT: true,
      isLPS: false,
      limit: '0',
      mintable: false,
      minted: '0',
      name: '',
      priceFeedId: 'AAPL/USD',
      symbol: 'AAPL',
      symbolKey: 'AAPL',
      tokenId: '1',
      tradeable: true
    })
  })

  it('should throw error while getting non-existent scheme', async () => {
    expect.assertions(2)
    try {
      await controller.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find scheme',
        error: 'Not Found'
      })
    }
  })
})
