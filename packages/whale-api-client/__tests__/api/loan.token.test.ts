import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from './loan_container'

let container: LoanMasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new LoanMasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  const testing = Testing.create(container)

  await testing.container.call('appointoracle', [await testing.generateAddress(), [
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' }
  ], 1])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'AAPL',
    name: 'APPLE',
    priceFeedId: 'AAPL/USD',
    mintable: false,
    interest: new BigNumber(0.01)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'TSLA',
    name: 'TESLA',
    priceFeedId: 'TSLA/USD',
    mintable: false,
    interest: new BigNumber(0.02)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'MSFT',
    name: 'MICROSOFT',
    priceFeedId: 'MSFT/USD',
    mintable: false,
    interest: new BigNumber(0.03)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'FB',
    name: 'FACEBOOK',
    priceFeedId: 'FB/USD',
    mintable: false,
    interest: new BigNumber(0.04)
  }])
  await testing.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should listLoanScheme', async () => {
    const result = await client.loan.listLoanTokens()
    expect(result.length).toStrictEqual(4)
    expect(result[0]).toStrictEqual({
      collateralAddress: expect.any(String),
      creation: {
        height: expect.any(Number),
        tx: expect.any(String)
      },
      decimal: 8,
      destruction: {
        height: expect.any(Number),
        tx: expect.any(String)
      },
      displaySymbol: 'dAAPL',
      finalized: false,
      id: expect.any(String),
      interest: 0.01,
      isDAT: true,
      isLPS: false,
      limit: '0',
      mintable: false,
      minted: '0',
      name: 'APPLE',
      priceFeedId: 'AAPL/USD',
      symbol: 'AAPL',
      symbolKey: 'AAPL',
      tokenId: '1',
      tradeable: true
    })

    expect(result[1].symbol).toStrictEqual('TSLA')
    expect(result[1].name).toStrictEqual('TESLA')

    expect(result[2].symbol).toStrictEqual('MSFT')
    expect(result[2].name).toStrictEqual('MICROSOFT')

    expect(result[3].symbol).toStrictEqual('FB')
    expect(result[3].name).toStrictEqual('FACEBOOK')
  })

  it('should listLoanSchemes with pagination', async () => {
    const first = await client.loan.listLoanTokens(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('2')

    expect(first[0].tokenId).toStrictEqual('1')
    expect(first[1].tokenId).toStrictEqual('2')

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('4')

    expect(next[0].tokenId).toStrictEqual('3')
    expect(next[1].tokenId).toStrictEqual('4')

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})
