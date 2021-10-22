import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from './loan_container'

let container: LoanMasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

let collateralTokenId1: string

beforeAll(async () => {
  container = new LoanMasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  const testing = Testing.create(container)

  await testing.token.create({ symbol: 'AAPL' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'TSLA' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'MSFT' })
  await testing.generate(1)

  await testing.token.create({ symbol: 'FB' })
  await testing.generate(1)

  const oracleId = await testing.rpc.oracle.appointOracle(await container.getNewAddress(),
    [
      { token: 'AAPL', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'MSFT', currency: 'USD' },
      { token: 'FB', currency: 'USD' }
    ], { weightage: 1 })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1.5@AAPL', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2.5@TSLA', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '3.5@MSFT', currency: 'USD' }] })
  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '4.5@FB', currency: 'USD' }] })
  await testing.generate(1)

  collateralTokenId1 = await testing.rpc.loan.setCollateralToken({
    token: 'AAPL',
    factor: new BigNumber(0.1),
    fixedIntervalPriceId: 'AAPL/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'TSLA',
    factor: new BigNumber(0.2),
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'MSFT',
    factor: new BigNumber(0.3),
    fixedIntervalPriceId: 'MSFT/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'FB',
    factor: new BigNumber(0.4),
    fixedIntervalPriceId: 'FB/USD'
  })
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
  it('should listCollateralTokens', async () => {
    const result = await client.loanCollateral.list()
    expect(result.length).toStrictEqual(4)
    expect(result[0]).toStrictEqual(
      {
        id: '0',
        token: 'AAPL',
        priceFeedId: 'AAPL/USD',
        factor: 0.1,
        activateAfterBlock: 108
      })

    expect(result[1]).toStrictEqual(
      {
        id: '3',
        token: 'FB',
        priceFeedId: 'FB/USD',
        factor: 0.4,
        activateAfterBlock: 111
      })

    expect(result[2]).toStrictEqual(
      {
        id: '2',
        token: 'MSFT',
        priceFeedId: 'MSFT/USD',
        factor: 0.3,
        activateAfterBlock: 110
      })

    expect(result[3]).toStrictEqual(
      {
        id: '1',
        token: 'TSLA',
        priceFeedId: 'TSLA/USD',
        factor: 0.2,
        activateAfterBlock: 109
      })
  })

  it('should listLoanSchemes with pagination', async () => {
    const first = await client.loanCollateral.list(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('FB')

    expect(first[0].token).toStrictEqual('AAPL')
    expect(first[1].token).toStrictEqual('FB')

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('TSLA')

    expect(next[0].token).toStrictEqual('MSFT')
    expect(next[1].token).toStrictEqual('TSLA')

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('get', () => {
  it('should get collateral token by symbol', async () => {
    const data = await client.loanCollateral.get('AAPL')
    expect(data).toStrictEqual({
      token: 'AAPL',
      factor: 0.1,
      fixedIntervalPriceId: 'AAPL/USD',
      activateAfterBlock: 108,
      tokenId: collateralTokenId1
    })
  })

  it('should fail due to getting non-existent or malformed collateral token id', async () => {
    expect.assertions(4)
    try {
      await client.loanCollateral.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find collateral token',
        url: '/v0.0/regtest/loans/collaterals/999'
      })
    }

    try {
      await client.loanCollateral.get('$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find collateral token',
        url: '/v0.0/regtest/loans/collaterals/$*@'
      })
    }
  })
})
