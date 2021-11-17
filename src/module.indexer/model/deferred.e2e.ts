import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { DeferredModelMapper } from '@src/module.model/deferred.model'
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

it('should deferred model serves pending state', async () => {
  await createLoanScheme('s150', 150, new BigNumber(3))
  await updateLoanScheme('s150', 155, new BigNumber(3.05), 110)

  {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)
  }

  const loanSchemeMapper = app.get(LoanSchemeMapper)
  const deferredMapper = app.get(DeferredModelMapper)

  const s150Before = await loanSchemeMapper.get('s150')
  expect(s150Before).toStrictEqual({
    id: 's150',
    ratio: 150,
    rate: '3',
    activateAfterBlock: '0',
    block: {
      hash: expect.any(String),
      height: expect.any(Number),
      medianTime: expect.any(Number),
      time: expect.any(Number)
    }
  })

  const s150PendingBefore = await deferredMapper.get('s150')
  expect(s150PendingBefore).toStrictEqual({
    id: 's150',
    ratio: 155,
    rate: '3.05',
    activateAfterBlock: '110',
    block: {
      hash: expect.any(String),
      height: expect.any(Number),
      medianTime: expect.any(Number),
      time: expect.any(Number)
    }
  })

  await testing.container.waitForBlockHeight(110)
  await waitForIndexedHeight(app, 110)

  const s150After = await loanSchemeMapper.get('s150')
  expect(s150After).toStrictEqual({
    id: 's150',
    ratio: 155,
    rate: '3.05',
    activateAfterBlock: '110',
    block: {
      hash: expect.any(String),
      height: expect.any(Number),
      medianTime: expect.any(Number),
      time: expect.any(Number)
    }
  })

  const s150PendingAfter = await deferredMapper.get('s150')
  expect(s150PendingAfter).toStrictEqual(undefined) // cleared
})
