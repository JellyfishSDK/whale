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

  // Default scheme
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(6.5),
    id: 'default'
  })
  await testing.generate(1)

  // Scheme1
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(5.5),
    id: 'scheme1'
  })
  await testing.generate(1)

  // Scheme2
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(4.5),
    id: 'scheme2'
  })
  await testing.generate(1)

  // Scheme3
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 250,
    interestRate: new BigNumber(3.5),
    id: 'scheme3'
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
  it('should listLoanScheme', async () => {
    const result = await client.loanScheme.list()
    expect(result.length).toStrictEqual(4)
    expect(result[0]).toStrictEqual(
      {
        id: 'default',
        mincolratio: 100,
        interestrate: 6.5,
        default: true
      })

    expect(result[1]).toStrictEqual(
      {
        id: 'scheme1',
        mincolratio: 150,
        interestrate: 5.5,
        default: false
      })

    expect(result[2]).toStrictEqual(
      {
        id: 'scheme2',
        mincolratio: 200,
        interestrate: 4.5,
        default: false
      })

    expect(result[3]).toStrictEqual(
      {
        id: 'scheme3',
        mincolratio: 250,
        interestrate: 3.5,
        default: false
      })
  })

  it('should listLoanSchemes with pagination', async () => {
    const first = await client.loanScheme.list(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('scheme1')

    expect(first[0].id).toStrictEqual('default')
    expect(first[1].id).toStrictEqual('scheme1')

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('scheme3')

    expect(next[0].id).toStrictEqual('scheme2')
    expect(next[1].id).toStrictEqual('scheme3')

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('get', () => {
  it('should get scheme by scheme id', async () => {
    const data = await client.loanScheme.get('scheme1')
    expect(data).toStrictEqual(
      { id: 'scheme1', mincolratio: 150, interestrate: 5.5 }
    )
  })

  it('should fail due to getting non-existent or malformed id', async () => {
    expect.assertions(4)
    try {
      await client.loanScheme.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find scheme',
        url: '/v0.0/regtest/loans/schemes/999'
      })
    }

    try {
      await client.loanScheme.get('$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find scheme',
        url: '/v0.0/regtest/loans/schemes/$*@'
      })
    }
  })
})
