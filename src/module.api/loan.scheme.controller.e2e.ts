import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanController)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(6.5),
    id: 'default'
  })
  await container.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(5.5),
    id: 'scheme1'
  })
  await container.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(4.5),
    id: 'scheme2'
  })
  await container.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 250,
    interestRate: new BigNumber(3.5),
    id: 'scheme3'
  })
  await container.generate(1)

  const height = await testing.container.getBlockCount()
  await waitForIndexedHeight(app, height - 1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('loan', () => {
  it('should listLoanSchemes', async () => {
    const result = await controller.listScheme({ size: 100 })
    expect(result.data.length).toStrictEqual(4)
    expect(result.data).toStrictEqual([
      {
        id: 'scheme3',
        sort: '00000069',
        minColRatio: 250,
        interestRate: '3.5',
        activateAfterBlock: '0',
        block: expect.any(Object)
      },
      {
        id: 'scheme2',
        sort: '00000068',
        minColRatio: 200,
        interestRate: '4.5',
        activateAfterBlock: '0',
        block: expect.any(Object)
      },
      {
        id: 'scheme1',
        sort: '00000067',
        minColRatio: 150,
        interestRate: '5.5',
        activateAfterBlock: '0',
        block: expect.any(Object)
      },
      {
        id: 'default',
        sort: '00000066',
        minColRatio: 100,
        interestRate: '6.5',
        activateAfterBlock: '0',
        block: expect.any(Object)
      }
    ])
    expect(result.page).toStrictEqual(undefined)
  })

  it('should listSchemes with pagination', async () => {
    const first = await controller.listScheme({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('00000068')

    expect(first.data[0].id).toStrictEqual('scheme3')
    expect(first.data[1].id).toStrictEqual('scheme2')

    const next = await controller.listScheme({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('00000066')

    expect(next.data[0].id).toStrictEqual('scheme1')
    expect(next.data[1].id).toStrictEqual('default')

    const last = await controller.listScheme({
      size: 2,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listSchemes with an empty object when providing out of range request', async () => {
    const result = await controller.listScheme({ size: 1, next: '00000018' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get scheme by symbol', async () => {
    const data = await controller.getScheme('default')
    expect(data).toStrictEqual(
      {
        id: 'default',
        sort: '00000066',
        minColRatio: 100,
        interestRate: '6.5',
        activateAfterBlock: '0',
        block: expect.any(Object)
      }
    )
  })

  it('should throw error while getting non-existent scheme', async () => {
    const promise = controller.getScheme('999')

    await expect(promise).rejects.toThrow(NotFoundException)
    await expect(promise).rejects.toThrow('Unable to find scheme')
  })
})
