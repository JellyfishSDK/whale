import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
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

  const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' }
  ], 1])
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1.5@AAPL', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2.5@TSLA', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3.5@MSFT', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '4.5@FB', currency: 'USD' }] })
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD',
    mintable: false,
    interest: new BigNumber(0.01)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'TSLA',
    fixedIntervalPriceId: 'AAPL/USD',
    mintable: false,
    interest: new BigNumber(0.02)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD',
    mintable: false,
    interest: new BigNumber(0.03)
  }])
  await testing.generate(1)

  await testing.container.call('setloantoken', [{
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD',
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
  it('should listLoanTokens', async () => {
    const result = await client.loanToken.list()
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
      name: '',
      priceFeedId: 'AAPL/USD',
      symbol: 'AAPL',
      symbolKey: 'AAPL',
      tokenId: '1',
      tradeable: true
    })

    expect(result[1].symbol).toStrictEqual('TSLA')
    expect(result[2].symbol).toStrictEqual('MSFT')
    expect(result[3].symbol).toStrictEqual('FB')
  })

  it('should listLoanTokens with pagination', async () => {
    const first = await client.loanToken.list(2)

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

  describe('get', () => {
    it('should get loan token by loan token id', async () => {
      const data = await client.loanToken.get('AAPL')
      console.log(data)
    })

    it('should fail due to getting non-existent or malformed id', async () => {
      expect.assertions(4)
      try {
        await client.loanToken.get('999')
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 404,
          type: 'NotFound',
          at: expect.any(Number),
          message: 'Unable to find loan tokens',
          url: '/v0.0/regtest/loans/tokens/999'
        })
      }

      try {
        await client.loanToken.get('$*@')
      } catch (err) {
        expect(err).toBeInstanceOf(WhaleApiException)
        expect(err.error).toStrictEqual({
          code: 404,
          type: 'NotFound',
          at: expect.any(Number),
          message: 'Unable to find loan tokens',
          url: '/v0.0/regtest/loans/tokens/$*@'
        })
      }
    })
  })
})
