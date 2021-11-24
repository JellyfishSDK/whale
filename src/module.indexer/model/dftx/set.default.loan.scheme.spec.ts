import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
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
  // await createLoanScheme('s250', 250, new BigNumber(2.5))
  // await createLoanScheme('s300', 300, new BigNumber(2.3))

  await setDefaultLoanScheme('s200')

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)

  const s150 = await loanSchemeMapper.get('s150')
  expect(s150).toStrictEqual({
    id: 's150',
    ratio: 150,
    rate: '3',
    activateAfterBlock: '0',
    default: false,
    block: expect.any(Object)
  })
  const s200 = await loanSchemeMapper.get('s200')
  expect(s200).toStrictEqual({
    id: 's200',
    ratio: 200,
    rate: '2.8',
    activateAfterBlock: '0',
    default: true,
    block: expect.any(Object)
  })

  const s150History = await loanSchemeHistoryMapper.query('s150', 100)
  expect(s150History).toStrictEqual([
    {
      id: 's150-104',
      ratio: 150,
      rate: '3',
      activateAfterBlock: '0',
      default: false,
      block: expect.any(Object),
      loanSchemeId: 's150',
      sort: '00000068',
      event: 'unsetDefault'
    },
    {
      id: 's150-102',
      ratio: 150,
      rate: '3',
      activateAfterBlock: '0',
      default: false,
      block: expect.any(Object),
      loanSchemeId: 's150',
      sort: '00000066',
      event: 'create'
    }
  ])

  const s200History = await loanSchemeHistoryMapper.query('s200', 100)
  expect(s200History).toStrictEqual([
    {
      id: 's200-104',
      ratio: 200,
      rate: '2.8',
      activateAfterBlock: '0',
      default: true,
      block: expect.any(Object),
      loanSchemeId: 's200',
      sort: '00000068',
      event: 'setDefault'
    },
    {
      id: 's200-103',
      ratio: 200,
      rate: '2.8',
      activateAfterBlock: '0',
      default: false,
      block: expect.any(Object),
      loanSchemeId: 's200',
      sort: '00000067',
      event: 'create'
    }
  ])
})
