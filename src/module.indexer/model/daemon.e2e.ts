import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
// import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
// import { LoanSchemeHistoryMapper } from '@src/module.model/loan.scheme.history'
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

describe('', () => {
  it('', async () => {
    await createLoanScheme('s150', 150, new BigNumber(3))

    {
      const height = await testing.container.call('getblockcount')
      await testing.container.generate(1)
      await waitForIndexedHeight(app, height)
    }

    // const loanSchemeMapper = app.get(LoanSchemeMapper)
    // const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)
  })
})
