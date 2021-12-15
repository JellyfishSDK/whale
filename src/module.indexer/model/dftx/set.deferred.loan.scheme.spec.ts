import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper } from '@src/module.model/loan.scheme.history'
import { DeferredLoanSchemeMapper } from '@src/module.model/deferred.loan.scheme'
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
  return await testing.rpc.loan.createLoanScheme({
    id: nameAsId,
    minColRatio: minColRatio,
    interestRate: interestRate
  })
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
  return await testing.rpc.loan.updateLoanScheme(payload)
}

it('should deferred model serves pending state', async () => {
  const txidS150c = await createLoanScheme('s150', 150, new BigNumber(3))
  await testing.generate(1)
  const txidS150u = await updateLoanScheme('s150', 155, new BigNumber(3.05), 120)
  await testing.generate(1)

  await createLoanScheme('s160', 160, new BigNumber(4))
  await testing.generate(1)
  const txidS160u = await updateLoanScheme('s160', 165, new BigNumber(4.05), 120)
  await testing.generate(1)

  await createLoanScheme('s170', 170, new BigNumber(5))
  await testing.generate(1)

  const txidS170u = await updateLoanScheme('s170', 175, new BigNumber(5.05), 120)
  await testing.generate(1)

  await createLoanScheme('s180', 180, new BigNumber(6))
  await testing.generate(1)

  const txidS180u = await updateLoanScheme('s180', 185, new BigNumber(6.05), 120)
  await testing.generate(1)

  await createLoanScheme('s190', 190, new BigNumber(7))
  await testing.generate(1)

  const txid190u = await updateLoanScheme('s190', 195, new BigNumber(7.05), 120)
  await testing.generate(1)

  await createLoanScheme('s200', 200, new BigNumber(8))
  await testing.generate(1)

  const txidS200u = await updateLoanScheme('s200', 205, new BigNumber(8.05), 120)
  await testing.generate(1)

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const deferredMapper = app.get(DeferredLoanSchemeMapper)

  // pick s150 check as example
  const s150Before = await loanSchemeMapper.get('s150')
  expect(s150Before).toStrictEqual({
    id: 's150',
    sort: `00000066-0-${txidS150c}`,
    minColRatio: 150,
    interestRate: '3',
    activateAfterBlock: '0',
    block: expect.any(Object)
  })

  // test pagination
  const first = await deferredMapper.query(120, 2)
  expect(first).toStrictEqual([
    {
      id: `s150-${txidS150u}`,
      sort: `00000067-0-${txidS150u}`,
      loanSchemeId: 's150',
      minColRatio: 155,
      interestRate: '3.05',
      activateAfterBlock: '120',
      activated: false,
      block: expect.any(Object)
    },
    {
      id: `s160-${txidS160u}`,
      sort: `00000069-0-${txidS160u}`,
      loanSchemeId: 's160',
      minColRatio: 165,
      interestRate: '4.05',
      activateAfterBlock: '120',
      activated: false,
      block: expect.any(Object)
    }
  ])

  const next = await deferredMapper.query(120, 2, first[first.length - 1].sort)
  expect(next).toStrictEqual([
    {
      id: `s170-${txidS170u}`,
      sort: `0000006b-0-${txidS170u}`,
      loanSchemeId: 's170',
      minColRatio: 175,
      interestRate: '5.05',
      activateAfterBlock: '120',
      activated: false,
      block: expect.any(Object)
    },
    {
      id: `s180-${txidS180u}`,
      sort: `0000006d-0-${txidS180u}`,
      loanSchemeId: 's180',
      minColRatio: 185,
      interestRate: '6.05',
      activateAfterBlock: '120',
      activated: false,
      block: expect.any(Object)
    }
  ])

  const last = await deferredMapper.query(120, 2, next[next.length - 1].sort)
  expect(last).toStrictEqual([
    {
      id: `s190-${txid190u}`,
      sort: `0000006f-0-${txid190u}`,
      loanSchemeId: 's190',
      minColRatio: 195,
      interestRate: '7.05',
      activateAfterBlock: '120',
      activated: false,
      block: expect.any(Object)
    },
    {
      id: `s200-${txidS200u}`,
      sort: `00000071-0-${txidS200u}`,
      loanSchemeId: 's200',
      minColRatio: 205,
      interestRate: '8.05',
      activateAfterBlock: '120',
      activated: false,
      block: expect.any(Object)
    }
  ])

  await testing.container.waitForBlockHeight(120)
  await waitForIndexedHeight(app, 120)

  const s150After = await loanSchemeMapper.get('s150')
  expect(s150After).toStrictEqual({
    id: 's150',
    sort: `00000067-0-${txidS150u}`,
    minColRatio: 155,
    interestRate: '3.05',
    activateAfterBlock: '120',
    block: expect.any(Object)
  })

  // all 6 should be activated
  const deferredList = await deferredMapper.query(120, 100)
  const activated = deferredList.filter(each => each.activated)
  expect(activated.length).toStrictEqual(6)
})

it('test same block deferred model', async () => {
  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const deferredMapper = app.get(DeferredLoanSchemeMapper)

  const txidS150c = await createLoanScheme('s150', 150, new BigNumber(3))
  await testing.generate(1)

  const txidS150u1 = await updateLoanScheme('s150', 151, new BigNumber(3), 120)
  const txidS150u2 = await updateLoanScheme('s150', 152, new BigNumber(3), 120)
  const txidS150u3 = await updateLoanScheme('s150', 153, new BigNumber(3), 120)
  await testing.generate(1)

  await testing.container.waitForBlockHeight(115)
  await waitForIndexedHeight(app, 115)

  const deferredListBefore = await deferredMapper.query(120, 100)
  const activatedBefore = deferredListBefore.filter(each => each.activated)
  expect(activatedBefore.length).toStrictEqual(0)

  await testing.container.waitForBlockHeight(120)
  await waitForIndexedHeight(app, 120)

  const s150 = await loanSchemeMapper.get('s150')
  expect(s150).toStrictEqual({
    id: 's150',
    sort: `00000067-4-${txidS150u2}`,
    minColRatio: 152,
    interestRate: '3',
    activateAfterBlock: '120',
    block: expect.any(Object)
  })

  const history = await loanSchemeHistoryMapper.query('s150', 100)
  expect(history).toStrictEqual([
    {
      id: `s150-${txidS150u2}`,
      sort: `00000067-4-${txidS150u2}`,
      minColRatio: 152,
      interestRate: '3',
      activateAfterBlock: '120',
      block: expect.any(Object),
      loanSchemeId: 's150',
      event: 'update'
    },
    {
      id: `s150-${txidS150u3}`,
      sort: `00000067-3-${txidS150u3}`,
      minColRatio: 153,
      interestRate: '3',
      activateAfterBlock: '120',
      block: expect.any(Object),
      loanSchemeId: 's150',
      event: 'update'
    },
    {
      id: `s150-${txidS150u1}`,
      sort: `00000067-2-${txidS150u1}`,
      minColRatio: 151,
      interestRate: '3',
      activateAfterBlock: '120',
      block: expect.any(Object),
      loanSchemeId: 's150',
      event: 'update'
    },
    {
      id: `s150-${txidS150c}`,
      sort: `00000066-0-${txidS150c}`,
      minColRatio: 150,
      interestRate: '3',
      activateAfterBlock: '0',
      block: expect.any(Object),
      loanSchemeId: 's150',
      event: 'create'
    }
  ])

  const deferredList = await deferredMapper.query(120, 100)
  const activated = deferredList.filter(each => each.activated)
  expect(activated.length).toStrictEqual(3)
})
