import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from '@src/module.api/loan_container'
import { LoanCollateralController } from '@src/module.api/loan.collateral.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanCollateralController

let collateralTokenId1: string
let collateralTokenId2: string
let collateralTokenId3: string
let collateralTokenId4: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanCollateralController)

  await testing.token.create({ symbol: 'AAPL' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'TSLA' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'MSFT' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'FB' })
  await testing.generate(1)

  await testing.rpc.oracle.appointOracle(await container.getNewAddress(),
    [
      { token: 'AAPL', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'MSFT', currency: 'USD' },
      { token: 'FB', currency: 'USD' }
    ], { weightage: 1 })
  await testing.generate(1)

  collateralTokenId1 = await testing.rpc.loan.setCollateralToken({
    token: 'AAPL',
    factor: new BigNumber(0.1),
    priceFeedId: 'AAPL/USD'
  })
  await testing.generate(1)

  collateralTokenId2 = await testing.rpc.loan.setCollateralToken({
    token: 'TSLA',
    factor: new BigNumber(0.2),
    priceFeedId: 'TSLA/USD'
  })
  await testing.generate(1)

  collateralTokenId3 = await testing.rpc.loan.setCollateralToken({
    token: 'MSFT',
    factor: new BigNumber(0.3),
    priceFeedId: 'MSFT/USD'
  })
  await testing.generate(1)

  collateralTokenId4 = await testing.rpc.loan.setCollateralToken({
    token: 'FB',
    factor: new BigNumber(0.4),
    priceFeedId: 'FB/USD'
  })
  await testing.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('loan', () => {
  it('should listCollateralTokens', async () => {
    const result = await controller.list({ size: 100 })
    expect(result.data.length).toStrictEqual(4)
    expect(result.data).toStrictEqual([
      {
        id: collateralTokenId1,
        token: 'AAPL',
        priceFeedId: 'AAPL/USD',
        factor: new BigNumber(0.1),
        activateAfterBlock: new BigNumber(107)
      },
      {
        id: collateralTokenId4,
        token: 'FB',
        priceFeedId: 'FB/USD',
        factor: new BigNumber(0.4),
        activateAfterBlock: new BigNumber(110)
      },
      {
        id: collateralTokenId3,
        token: 'MSFT',
        priceFeedId: 'MSFT/USD',
        factor: new BigNumber(0.3),
        activateAfterBlock: new BigNumber(109)
      },
      {
        id: collateralTokenId2,
        token: 'TSLA',
        priceFeedId: 'TSLA/USD',
        factor: new BigNumber(0.2),
        activateAfterBlock: new BigNumber(108)
      }
    ])
  })

  it('should listCollateralTokens with pagination', async () => {
    const first = await controller.list({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('FB')

    expect(first.data[0].token).toStrictEqual('AAPL')
    expect(first.data[1].token).toStrictEqual('FB')

    const next = await controller.list({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('TSLA')

    expect(next.data[0].token).toStrictEqual('MSFT')
    expect(next.data[1].token).toStrictEqual('TSLA')

    const last = await controller.list({
      size: 2,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listCollateralTokens with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.list({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get collateral token by symbol', async () => {
    const data = await controller.get('AAPL')
    expect(data).toStrictEqual({
      [collateralTokenId1]: {
        token: 'AAPL',
        factor: new BigNumber(0.1),
        priceFeedId: 'AAPL/USD',
        activateAfterBlock: new BigNumber(107)
      }
    })
  })

  it('should throw error while getting non-existent collateral token', async () => {
    expect.assertions(2)
    try {
      await controller.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find collateral token',
        error: 'Not Found'
      })
    }
  })
})