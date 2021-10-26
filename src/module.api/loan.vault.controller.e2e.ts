import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanController

let address1: string
let vaultId1: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanController)

  // loan schemes
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(1.5),
    id: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(2.5),
    id: 'scheme'
  })
  await testing.generate(1)

  // Create vaults
  address1 = await testing.generateAddress()
  vaultId1 = await testing.rpc.loan.createVault({
    ownerAddress: address1,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.generateAddress(),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.generateAddress(),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.generateAddress(),
    loanSchemeId: 'default'
  })
  await testing.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('loan', () => {
  it('should listVaults with size only', async () => {
    const result = await controller.listVault({
      size: 100
    })
    expect(result.data.length).toStrictEqual(4)
  })
})

describe('get', () => {
  it('should get vault by vaultId', async () => {
    const data = await controller.getVault(vaultId1)
    expect(data).toStrictEqual({
      vaultId: vaultId1,
      loanSchemeId: 'default',
      ownerAddress: address1,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: [],
      interestValue: '',
      invalidPrice: false,
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      currentRatio: expect.any(BigNumber)
    })
  })

  it('should throw error while getting non-existent vault', async () => {
    expect.assertions(4)
    try {
      await controller.getVault('0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find vault',
        error: 'Not Found'
      })
    }

    try {
      await controller.getVault('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find vault',
        error: 'Not Found'
      })
    }
  })
})
