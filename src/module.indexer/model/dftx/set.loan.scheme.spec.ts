import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DefaultLoanSchemeMapper, DefaultLoanScheme } from '@src/module.model/default.loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent } from '@src/module.model/loan.scheme.history'
import { DeferredLoanSchemeMapper, DeferredLoanScheme } from '@src/module.model/deferred.loan.scheme'
import BigNumber from 'bignumber.js'

let app: NestFastifyApplication
const testing = Testing.create(new MasterNodeRegTestContainer())

beforeEach(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await testing.container.waitForWalletBalanceGTE(100)
  app = await createTestingApp(testing.container)
})

afterEach(async () => {
  await stopTestingApp(testing.container, app)
})

async function createLoanScheme (nameAsId: string, minColRatio: number, interestRate: BigNumber): Promise<string> {
  const loanSchemeId = await testing.rpc.loan.createLoanScheme({
    id: nameAsId,
    minColRatio: minColRatio,
    interestRate: interestRate
  })
  await testing.generate(1)
  return loanSchemeId
}

async function updateLoanScheme (nameAsId: string, minColRatio: number, interestRate: BigNumber, activateAfterBlock?: number): Promise<string> {
  const payload: any = {
    id: nameAsId,
    minColRatio: minColRatio,
    interestRate: interestRate
  }
  if (activateAfterBlock !== undefined) {
    payload.activateAfterBlock = activateAfterBlock
  }
  const loanSchemeId = await testing.rpc.loan.updateLoanScheme(payload)
  await testing.generate(1)
  return loanSchemeId
}

it('should index setLoanScheme in CREATE event', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3))
  await createLoanScheme('s200', 200, new BigNumber(2.8))
  await createLoanScheme('s250', 250, new BigNumber(2.5))

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const defaultLoanSchemeMapper = app.get(DefaultLoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)

  const defaultLoanScheme = await defaultLoanSchemeMapper.get() as DefaultLoanScheme
  expect(defaultLoanScheme).toStrictEqual({ id: 's150' })

  // loanSchemeMapper
  {
    const s200 = await loanSchemeMapper.get('s200')
    expect(s200).toStrictEqual({
      id: 's200',
      sort: '00000067',
      minColRatio: 200,
      interestRate: '2.8',
      activateAfterBlock: '0',
      block: expect.any(Object)
    })

    const list = await loanSchemeMapper.query(30)
    expect(list.length).toStrictEqual(3)
    expect(list).toStrictEqual([
      {
        id: 's250',
        sort: '00000068',
        minColRatio: 250,
        interestRate: '2.5',
        activateAfterBlock: '0',
        block: expect.any(Object)
      },
      {
        id: 's200',
        sort: '00000067',
        minColRatio: 200,
        interestRate: '2.8',
        activateAfterBlock: '0',
        block: expect.any(Object)
      },
      {
        id: 's150',
        sort: '00000066',
        minColRatio: 150,
        interestRate: '3',
        activateAfterBlock: '0',
        block: expect.any(Object)
      }
    ])

    // test query limit
    const listLimit = await loanSchemeMapper.query(1)
    expect(listLimit.length).toStrictEqual(1)
  }

  // loanSchemeHistoryMapper
  {
    const histories = await loanSchemeHistoryMapper.query('s150', 30)
    expect(histories.length).toStrictEqual(1)
    expect(histories).toStrictEqual([
      {
        id: 's150-102',
        loanSchemeId: 's150',
        sort: '00000066',
        minColRatio: 150,
        interestRate: '3',
        activateAfterBlock: '0',
        event: LoanSchemeHistoryEvent.CREATE,
        block: expect.any(Object)
      }
    ])

    const s150 = await loanSchemeHistoryMapper.get('s150-102')
    expect(s150).toStrictEqual(histories[0])
  }
})

it('should index setLoanScheme in UPDATE event', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3))
  await createLoanScheme('s200', 200, new BigNumber(2.8))
  await createLoanScheme('s250', 250, new BigNumber(2.5))

  await updateLoanScheme('s150', 155, new BigNumber(3.05))
  await updateLoanScheme('s200', 205, new BigNumber(2.85))
  await updateLoanScheme('s250', 255, new BigNumber(2.55))

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const defaultLoanSchemeMapper = app.get(DefaultLoanSchemeMapper)

  const defaultLoanScheme = await defaultLoanSchemeMapper.get() as DefaultLoanScheme
  expect(defaultLoanScheme).toStrictEqual({ id: 's150' })

  // loanSchemeMapper
  {
    const s200 = await loanSchemeMapper.get('s200')
    expect(s200).toStrictEqual({
      id: 's200',
      sort: '0000006a',
      minColRatio: 205,
      interestRate: '2.85',
      activateAfterBlock: '18446744073709551615', // new BigNumber('0xffffffffffffffff')
      block: expect.any(Object)
    })

    const list = await loanSchemeMapper.query(30)
    expect(list).toStrictEqual([
      {
        id: 's250',
        sort: '0000006b',
        minColRatio: 255,
        interestRate: '2.55',
        activateAfterBlock: '18446744073709551615', // new BigNumber('0xffffffffffffffff')
        block: expect.any(Object)
      },
      {
        id: 's200',
        sort: '0000006a',
        minColRatio: 205,
        interestRate: '2.85',
        activateAfterBlock: '18446744073709551615', // new BigNumber('0xffffffffffffffff')
        block: expect.any(Object)
      },
      {
        id: 's150',
        sort: '00000069',
        minColRatio: 155,
        interestRate: '3.05',
        activateAfterBlock: '18446744073709551615', // new BigNumber('0xffffffffffffffff')
        block: expect.any(Object)
      }
    ])
  }

  {
    const histories = await loanSchemeHistoryMapper.query('s150', 30)
    expect(histories).toStrictEqual([
      {
        id: 's150-105',
        loanSchemeId: 's150',
        sort: '00000069',
        minColRatio: 155,
        interestRate: '3.05',
        activateAfterBlock: '18446744073709551615', // new BigNumber('0xffffffffffffffff')
        event: 'update',
        block: expect.any(Object)
      },
      {
        id: 's150-102',
        loanSchemeId: 's150',
        sort: '00000066',
        minColRatio: 150,
        interestRate: '3',
        activateAfterBlock: '0',
        event: 'create',
        block: expect.any(Object)
      }
    ])

    const s150 = await loanSchemeHistoryMapper.get('s150-102')
    expect(s150).toStrictEqual({
      id: 's150-102',
      loanSchemeId: 's150',
      sort: '00000066',
      minColRatio: 150,
      interestRate: '3',
      activateAfterBlock: '0',
      event: 'create',
      block: expect.any(Object)
    })
  }
})

it('test update loanScheme with activateAfterBlock', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3))
  await updateLoanScheme('s150', 155, new BigNumber(3.05), 110)

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const deferredLoanSchemeMapper = app.get(DeferredLoanSchemeMapper)
  const defaultLoanSchemeMapper = app.get(DefaultLoanSchemeMapper)

  const defaultLoanScheme = await defaultLoanSchemeMapper.get() as DefaultLoanScheme
  expect(defaultLoanScheme).toStrictEqual({ id: 's150' })

  const s150Before = await loanSchemeMapper.get('s150')
  expect(s150Before).toStrictEqual({
    id: 's150',
    sort: '00000066',
    minColRatio: 150,
    interestRate: '3',
    activateAfterBlock: '0',
    block: expect.any(Object)
  })

  const deferredLoanSchemesBefore = await deferredLoanSchemeMapper.query(110, 100)
  const s150PendingBefore = deferredLoanSchemesBefore.find(l => l.loanSchemeId === 's150')
  expect(s150PendingBefore).toStrictEqual({
    id: 's150-103',
    sort: '00000067',
    loanSchemeId: 's150',
    minColRatio: 155,
    interestRate: '3.05',
    activateAfterBlock: '110',
    activated: false,
    block: expect.any(Object)
  })

  const listBefore = await loanSchemeHistoryMapper.query('s150', 100)
  expect(listBefore).toStrictEqual([
    {
      id: 's150-103',
      loanSchemeId: 's150',
      sort: '00000067',
      minColRatio: 155,
      interestRate: '3.05',
      activateAfterBlock: '110',
      event: 'update',
      block: expect.any(Object)
    },
    {
      id: 's150-102',
      loanSchemeId: 's150',
      sort: '00000066',
      minColRatio: 150,
      interestRate: '3',
      activateAfterBlock: '0',
      event: 'create',
      block: expect.any(Object)
    }
  ])

  await testing.container.waitForBlockHeight(110)
  await waitForIndexedHeight(app, 110)

  const s150After = await loanSchemeMapper.get('s150')
  expect(s150After).toStrictEqual({
    id: 's150',
    sort: '00000067',
    minColRatio: 155,
    interestRate: '3.05',
    activateAfterBlock: '110',
    block: expect.any(Object)
  })

  const deferredLoanSchemesAfter = await deferredLoanSchemeMapper.query(110, 100)
  const s150PendingAfter = deferredLoanSchemesAfter.find(l => l.loanSchemeId === 's150') as DeferredLoanScheme
  expect(s150PendingAfter.activated).toStrictEqual(true)

  const listAfter = await loanSchemeHistoryMapper.query('s150', 100)
  expect(listAfter).toStrictEqual(listBefore)
})
