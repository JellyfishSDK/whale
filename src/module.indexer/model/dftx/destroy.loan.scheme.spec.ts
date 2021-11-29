import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DeferredDestroyLoanSchemeMapper } from '@src/module.model/deferred.destroy.loan.scheme'
import { LoanSchemeHistoryMapper } from '@src/module.model/loan.scheme.history'
import BigNumber from 'bignumber.js'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'

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

async function destroyLoanScheme (nameAsId: string, activateAfterBlock?: number): Promise<void> {
  const payload: any = {
    id: nameAsId
  }
  if (activateAfterBlock !== undefined) {
    payload.activateAfterBlock = activateAfterBlock
  }
  await testing.rpc.loan.destroyLoanScheme(payload)
  await testing.generate(1)
}

it('should index destroyLoanScheme', async () => {
  await createLoanScheme('default', 100, new BigNumber(3))

  await createLoanScheme('s150', 150, new BigNumber(3))
  await destroyLoanScheme('s150')

  await createLoanScheme('s200', 200, new BigNumber(3))
  await updateLoanScheme('s200', 202, new BigNumber(3.3))
  await destroyLoanScheme('s200')

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)

  {
    const s150 = await loanSchemeMapper.get('s150')
    expect(s150).toStrictEqual(undefined)

    const history = await loanSchemeHistoryMapper.query('s150', 100)
    expect(history).toStrictEqual([
      {
        id: 's150-104',
        loanSchemeId: 's150',
        sort: '00000068',
        minColRatio: 150,
        interestRate: '3',
        activateAfterBlock: '0',
        event: 'destroy',
        block: expect.any(Object)
      },
      {
        id: 's150-103',
        loanSchemeId: 's150',
        sort: '00000067',
        minColRatio: 150,
        interestRate: '3',
        activateAfterBlock: '0',
        event: 'create',
        block: expect.any(Object)
      }
    ])
  }

  {
    const s200 = await loanSchemeMapper.get('s200')
    expect(s200).toStrictEqual(undefined)

    const history = await loanSchemeHistoryMapper.query('s200', 100)
    expect(history).toStrictEqual([
      {
        id: 's200-107',
        loanSchemeId: 's200',
        sort: '0000006b',
        minColRatio: 202,
        interestRate: '3.3',
        activateAfterBlock: '0',
        event: 'destroy',
        block: expect.any(Object)
      },
      {
        id: 's200-106',
        loanSchemeId: 's200',
        sort: '0000006a',
        minColRatio: 202,
        interestRate: '3.3',
        activateAfterBlock: '18446744073709551615',
        event: 'update',
        block: expect.any(Object)
      },
      {
        id: 's200-105',
        loanSchemeId: 's200',
        sort: '00000069',
        minColRatio: 200,
        interestRate: '3',
        activateAfterBlock: '0',
        event: 'create',
        block: expect.any(Object)
      }
    ])
  }
})

it('should index destroyLoanScheme with activateAfterBlock', async () => {
  await createLoanScheme('default', 100, new BigNumber(3))

  await createLoanScheme('s150', 150, new BigNumber(3))
  await destroyLoanScheme('s150', 110)

  await createLoanScheme('s200', 200, new BigNumber(3))
  await updateLoanScheme('s200', 202, new BigNumber(3.3), 109)
  await destroyLoanScheme('s200', 110)

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const deferredDestroyLoanSchemeMapper = app.get(DeferredDestroyLoanSchemeMapper)

  const s150Before = await loanSchemeMapper.get('s150')
  expect(s150Before).toStrictEqual({
    id: 's150',
    sort: '00000067',
    minColRatio: 150,
    interestRate: '3',
    activateAfterBlock: '0',
    block: expect.any(Object)
  })

  const s200Before = await loanSchemeMapper.get('s200')
  expect(s200Before).toStrictEqual({
    id: 's200',
    sort: '00000069',
    minColRatio: 200,
    interestRate: '3',
    activateAfterBlock: '0',
    block: expect.any(Object)
  })

  const deferredBefore = await deferredDestroyLoanSchemeMapper.query(110, 100)
  expect(deferredBefore).toStrictEqual([
    {
      id: 's200-107',
      sort: '0000006b',
      loanSchemeId: 's200',
      activateAfterBlock: '110',
      block: expect.any(Object),
      activated: false
    },
    {
      id: 's150-104',
      sort: '00000068',
      loanSchemeId: 's150',
      activateAfterBlock: '110',
      block: expect.any(Object),
      activated: false
    }
  ])

  const s150History = await loanSchemeHistoryMapper.query('s150', 100)
  expect(s150History).toStrictEqual([
    {
      id: 's150-104',
      loanSchemeId: 's150',
      sort: '00000068',
      minColRatio: 150,
      interestRate: '3',
      activateAfterBlock: '110',
      event: 'destroy',
      block: expect.any(Object)
    },
    {
      id: 's150-103',
      loanSchemeId: 's150',
      sort: '00000067',
      minColRatio: 150,
      interestRate: '3',
      activateAfterBlock: '0',
      event: 'create',
      block: expect.any(Object)
    }
  ])

  const s200History = await loanSchemeHistoryMapper.query('s200', 100)
  expect(s200History).toStrictEqual([
    {
      id: 's200-107',
      loanSchemeId: 's200',
      sort: '0000006b',
      minColRatio: 200,
      interestRate: '3',
      activateAfterBlock: '110',
      event: 'destroy',
      block: expect.any(Object)

    },
    {
      id: 's200-106',
      loanSchemeId: 's200',
      sort: '0000006a',
      minColRatio: 202,
      interestRate: '3.3',
      activateAfterBlock: '109',
      event: 'update',
      block: expect.any(Object)

    },
    {
      id: 's200-105',
      loanSchemeId: 's200',
      sort: '00000069',
      minColRatio: 200,
      interestRate: '3',
      activateAfterBlock: '0',
      event: 'create',
      block: expect.any(Object)

    }
  ])

  await testing.container.waitForBlockHeight(110)
  await waitForIndexedHeight(app, 110)

  const s150After = await loanSchemeMapper.get('s150')
  expect(s150After).toStrictEqual(undefined)

  const s200After = await loanSchemeMapper.get('s200')
  expect(s200After).toStrictEqual(undefined)

  const deferredAfter = await deferredDestroyLoanSchemeMapper.query(110, 100)
  expect(deferredAfter.every(each => each.activated)).toStrictEqual(true)
})

it('test destroy before update', async () => {
  await createLoanScheme('default', 100, new BigNumber(3))

  await createLoanScheme('s250', 250, new BigNumber(3))
  await updateLoanScheme('s250', 255, new BigNumber(3.3), 111) // id-104
  await destroyLoanScheme('s250', 110) // id-105

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const deferredLoanSchemeMapper = app.get(DeferredLoanSchemeMapper)
  const deferredDestroyLoanSchemeMapper = app.get(DeferredDestroyLoanSchemeMapper)

  const s250Before = await loanSchemeMapper.get('s250')
  expect(s250Before).toStrictEqual({
    id: 's250',
    sort: '00000067',
    minColRatio: 250,
    interestRate: '3',
    activateAfterBlock: '0',
    block: expect.any(Object)
  })

  const s250History = await loanSchemeHistoryMapper.query('s250', 100)
  expect(s250History).toStrictEqual([
    {
      id: 's250-105',
      loanSchemeId: 's250',
      sort: '00000069',
      minColRatio: 250,
      interestRate: '3',
      activateAfterBlock: '110',
      event: 'destroy',
      block: expect.any(Object)
    },
    {
      id: 's250-104',
      loanSchemeId: 's250',
      sort: '00000068',
      minColRatio: 255,
      interestRate: '3.3',
      activateAfterBlock: '111',
      event: 'update',
      block: expect.any(Object)
    },
    {
      id: 's250-103',
      loanSchemeId: 's250',
      sort: '00000067',
      minColRatio: 250,
      interestRate: '3',
      activateAfterBlock: '0',
      event: 'create',
      block: expect.any(Object)
    }
  ])

  const deferredDestroy110 = await deferredDestroyLoanSchemeMapper.query(110, 100)
  expect(deferredDestroy110).toStrictEqual([
    {
      id: 's250-105',
      sort: '00000069',
      loanSchemeId: 's250',
      activateAfterBlock: '110',
      block: expect.any(Object),
      activated: false
    }
  ])

  const deferred111 = await deferredLoanSchemeMapper.query(111, 100)
  expect(deferred111).toStrictEqual([
    {
      id: 's250-104',
      sort: '00000068',
      minColRatio: 255,
      interestRate: '3.3',
      activateAfterBlock: '111',
      block: expect.any(Object),
      loanSchemeId: 's250',
      activated: false
    }
  ])

  await testing.container.waitForBlockHeight(110)
  await waitForIndexedHeight(app, 110)

  const s250After = await loanSchemeMapper.get('s250')
  expect(s250After).toStrictEqual(undefined)

  await testing.container.waitForBlockHeight(111)
  await waitForIndexedHeight(app, 111)

  // ensure the destroyed s250 should not be created again
  {
    const deferred111 = await deferredLoanSchemeMapper.query(111, 100)
    expect(deferred111).toStrictEqual([]) // the deferred update should not exists as it came after destroy

    const s250After = await loanSchemeMapper.get('s250')
    expect(s250After).toStrictEqual(undefined)
  }
})
