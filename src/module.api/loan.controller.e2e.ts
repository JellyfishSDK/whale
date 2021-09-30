import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from '@src/module.api/loan_container'
import { LoanController } from '@src/module.api/loan.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanController

let address1: string
// let address2: string
// let address3: string
// let address4: string

let vaultId1: string
// let vaultId2: string
// let vaultId3: string
// let vaultId4: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get(LoanController)

  await waitForIndexedHeight(app, 100)
  const testing = Testing.create(container)

  // loan scheme
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(2.5),
    id: 'default'
  })

  await testing.generate(1)

  address1 = await testing.generateAddress()
  // address2 =  await testing.generateAddress()
  // address3 =  await testing.generateAddress()
  // address4 =  await testing.generateAddress()

  vaultId1 = await testing.rpc.loan.createVault({
    ownerAddress: address1,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  // vaultId2 = await testing.rpc.loan.createVault({
  //   ownerAddress: address2,
  //   loanSchemeId: 'default'
  // })
  // await testing.generate(1)
  //
  // vaultId3 = await testing.rpc.loan.createVault({
  //   ownerAddress: address3,
  //   loanSchemeId: 'default'
  // })
  // await testing.generate(1)
  //
  // vaultId4 = await testing.rpc.loan.createVault({
  //   ownerAddress: address4,
  //   loanSchemeId: 'default'
  // })
  // await testing.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

// describe('loan', () => {
//   it('should listVaults', async () => {
//     const result = await controller.list({ size: 100 })
//     expect(result.data.length).toStrictEqual(4)
//     expect(result.data).toStrictEqual([{
//       [vaultId1]: {
//         ownerAddress: address1,
//         loanSchemeId: 'default',
//         isUnderLiquidation: false
//       },
//       [vaultId2]: {
//         ownerAddress: address2,
//         loanSchemeId: 'default',
//         isUnderLiquidation: false
//       },
//       [vaultId3]: {
//         ownerAddress: address3,
//         loanSchemeId: 'default',
//         isUnderLiquidation: false
//       },
//       [vaultId4]: {
//         ownerAddress: address4,
//         loanSchemeId: 'default',
//         isUnderLiquidation: false
//       }
//     }])
//   })
//
//   it('should listVaults with pagination', async () => {
//     let vaultArr = [vaultId1, vaultId2, vaultId3, vaultId4].sort()
//
//     const first = await controller.list({ size: 2 })
//
//     expect(first.data.length).toStrictEqual(2)
//     expect(first.page?.next).toStrictEqual(vaultArr[1])
//
//     expect(first.data[0].id).toStrictEqual(vaultArr[0])
//     expect(first.data[1].id).toStrictEqual(vaultArr[1])
//
//     const next = await controller.list({
//       size: 2,
//       next: first.page?.next
//     })
//
//     expect(next.data.length).toStrictEqual(2)
//     expect(next.page?.next).toStrictEqual(vaultArr[3])
//
//     expect(next.data[0].id).toStrictEqual(vaultArr[2])
//     expect(next.data[1].id).toStrictEqual(vaultArr[3])
//
//     const last = await controller.list({
//       size: 2,
//       next: next.page?.next
//     })
//
//     expect(last.data.length).toStrictEqual(0)
//     expect(last.page).toBeUndefined()
//    })
//
//   it('should listVaults with an empty object if size 100 next 300 which is out of range', async () => {
//     const result = await controller.list({ size: 100, next: '300' })
//
//     expect(result.data.length).toStrictEqual(0)
//     expect(result.page).toBeUndefined()
//   })
// })

describe('get', () => {
  it('should get vault by vaultId', async () => {
    const data = await controller.get(vaultId1)
    expect(data).toStrictEqual({
      loanSchemeId: 'default',
      ownerAddress: address1,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: [],
      collateralValue: expect.any(BigNumber),
      loanValue: expect.any(BigNumber),
      currentRatio: expect.any(BigNumber)
    })
  })

  it('should throw error while getting non-existent vault', async () => {
    expect.assertions(4)
    try {
      await controller.get('0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find vault',
        error: 'Not Found'
      })
    }

    try {
      await controller.get('999')
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
