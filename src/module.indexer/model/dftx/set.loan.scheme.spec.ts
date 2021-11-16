import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { LoanSchemeMapper } from '@src/module.model/loan.scheme'
import { LoanSchemeHistoryMapper, LoanSchemeHistoryEvent } from '@src/module.model/loan.scheme.history'
import BigNumber from 'bignumber.js'

let app: NestFastifyApplication
const testing = Testing.create(new MasterNodeRegTestContainer())

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await testing.container.waitForWalletBalanceGTE(100)
  app = await createTestingApp(testing.container)
})

afterAll(async () => {
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

describe('createLoanScheme', () => {
  it('should index createLoanScheme', async () => {
    await createLoanScheme('s150', 150, new BigNumber(3))
    await createLoanScheme('s200', 200, new BigNumber(2.8))
    await createLoanScheme('s250', 250, new BigNumber(2.5))

    const loanSchemeMapper = app.get(LoanSchemeMapper)
    const loanSchemeHistoryMapper = app.get(LoanSchemeHistoryMapper)

    {
      const height = await testing.container.call('getblockcount')
      await testing.container.generate(1)
      await waitForIndexedHeight(app, height)
    }

    // loanSchemeMapper
    {
      const s200 = await loanSchemeMapper.get('s200')
      expect(s200).toStrictEqual({
        id: 's200',
        ratio: 200,
        rate: '2.8',
        activateAfterBlock: '0',
        block: {
          hash: expect.any(String),
          height: expect.any(Number),
          medianTime: expect.any(Number),
          time: expect.any(Number)
        }
      })

      const queryResult = await loanSchemeMapper.query(30)
      expect(queryResult.length).toStrictEqual(3)
      expect(queryResult).toStrictEqual([
        {
          id: 's250',
          ratio: 250,
          rate: '2.5',
          activateAfterBlock: '0',
          block: {
            hash: expect.any(String),
            height: expect.any(Number),
            medianTime: expect.any(Number),
            time: expect.any(Number)
          }
        },
        {
          id: 's200',
          ratio: 200,
          rate: '2.8',
          activateAfterBlock: '0',
          block: {
            hash: expect.any(String),
            height: expect.any(Number),
            medianTime: expect.any(Number),
            time: expect.any(Number)
          }
        },
        {
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
        }
      ])

      // test query limit
      const queryResultLimit = await loanSchemeMapper.query(1)
      expect(queryResultLimit.length).toStrictEqual(1)
    }

    // loanSchemeHistoryMapper
    {
      const historyResult = await loanSchemeHistoryMapper.query('s150', 30)
      expect(historyResult.length).toStrictEqual(1)
      expect(historyResult).toStrictEqual([
        {
          id: 's150-102',
          loanSchemeId: 's150',
          sort: '00000066',
          ratio: 150,
          rate: '3',
          activateAfterBlock: '0',
          event: LoanSchemeHistoryEvent.CREATE,
          block: {
            hash: expect.any(String),
            height: expect.any(Number),
            medianTime: expect.any(Number),
            time: expect.any(Number)
          }
        }
      ])

      const s150 = await loanSchemeHistoryMapper.get('s150-102')
      expect(s150).toStrictEqual(historyResult[0])
    }
  })
})
