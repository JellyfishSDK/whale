import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { DefaultLoanScheme, DefaultLoanSchemeMapper } from '@src/module.model/default.loan.scheme'
import { LoanSchemeHistoryMapper } from '@src/module.model/loan.scheme.history'
import BigNumber from 'bignumber.js'
import { LoanSchemeResult } from '@defichain/jellyfish-api-core/dist/category/loan'

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

async function setDefaultLoanScheme (id: string): Promise<string> {
  return await testing.rpc.loan.setDefaultLoanScheme(id)
}

it('should index setDefaultLoanScheme', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3)) // first loan scheme is default
  await testing.generate(1)

  const txidS200 = await createLoanScheme('s200', 200, new BigNumber(2.8))
  await testing.generate(1)

  const txidS200s = await setDefaultLoanScheme('s200')
  await testing.generate(1)

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height - 1)
  }

  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const defaultLoanSchemeMapper = app.get(DefaultLoanSchemeMapper)

  const defaultLoanScheme = await defaultLoanSchemeMapper.get()
  expect(defaultLoanScheme).toStrictEqual({ id: 'defaultLoanScheme', loanSchemeId: 's200' })

  const s200History = await loanSchemeHistoryMapper.query('s200', 100)
  expect(s200History).toStrictEqual([
    {
      id: `s200-${txidS200s}`,
      minColRatio: 200,
      interestRate: '2.8',
      activateAfterBlock: '0',
      block: expect.any(Object),
      loanSchemeId: 's200',
      sort: `00000068-0-${txidS200s}`,
      event: 'setDefault'
    },
    {
      id: `s200-${txidS200}`,
      minColRatio: 200,
      interestRate: '2.8',
      activateAfterBlock: '0',
      block: expect.any(Object),
      loanSchemeId: 's200',
      sort: `00000067-0-${txidS200}`,
      event: 'create'
    }
  ])
})

it('test same block indexing', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3)) // first loan scheme is default
  await testing.generate(1)

  await createLoanScheme('s200', 200, new BigNumber(2))
  await createLoanScheme('s250', 250, new BigNumber(2.5))
  await createLoanScheme('s280', 280, new BigNumber(2.8))
  await testing.generate(1)

  await setDefaultLoanScheme('s200')
  await setDefaultLoanScheme('s250')
  await setDefaultLoanScheme('s280')
  await testing.generate(1)

  const list = await testing.rpc.loan.listLoanSchemes()
  const defaultLoanSchemeRPC = list.find(each => each.default) as LoanSchemeResult

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height - 1)
  }

  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const defaultLoanSchemeMapper = app.get(DefaultLoanSchemeMapper)

  const defaultLoanScheme = await defaultLoanSchemeMapper.get() as DefaultLoanScheme
  expect(defaultLoanSchemeRPC.id).toStrictEqual(defaultLoanScheme.loanSchemeId)

  const s200History = await loanSchemeHistoryMapper.query('s200', 100)
  expect(s200History[0].event).toStrictEqual('setDefault')
  const s250History = await loanSchemeHistoryMapper.query('s250', 100)
  expect(s250History[0].event).toStrictEqual('setDefault')
  const s280History = await loanSchemeHistoryMapper.query('s280', 100)
  expect(s280History[0].event).toStrictEqual('setDefault')
})
