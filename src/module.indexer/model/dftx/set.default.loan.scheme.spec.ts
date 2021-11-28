import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { DefaultLoanSchemeMapper } from '@src/module.model/default.loan.scheme'
import { LoanSchemeHistoryMapper } from '@src/module.model/loan.scheme.history'
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

async function setDefaultLoanScheme (id: string): Promise<string> {
  const loanSchemeId = await testing.rpc.loan.setDefaultLoanScheme(id)
  await testing.generate(1)
  return loanSchemeId
}

it('should index setDefaultLoanScheme', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3)) // first loan scheme is default
  await createLoanScheme('s200', 200, new BigNumber(2.8))

  await setDefaultLoanScheme('s200')

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height - 1)
  }

  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  const defaultLoanSchemeMapper = app.get(DefaultLoanSchemeMapper)

  const defaultLoanScheme = await defaultLoanSchemeMapper.get()
  expect(defaultLoanScheme).toStrictEqual({ id: 's200' })

  const s200History = await loanSchemeHistoryMapper.query('s200', 100)
  expect(s200History).toStrictEqual([
    {
      id: 's200-104',
      minColRatio: 200,
      interestRate: '2.8',
      activateAfterBlock: '0',
      block: expect.any(Object),
      loanSchemeId: 's200',
      sort: '00000068',
      event: 'setDefault'
    },
    {
      id: 's200-103',
      minColRatio: 200,
      interestRate: '2.8',
      activateAfterBlock: '0',
      block: expect.any(Object),
      loanSchemeId: 's200',
      sort: '00000067',
      event: 'create'
    }
  ])
})
