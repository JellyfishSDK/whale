import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'

let container: LoanMasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

let address1: string
let vaultId1: string

beforeAll(async () => {
  container = new LoanMasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  const testing = Testing.create(container)

  // loan scheme
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(2.5),
    id: 'default'
  })
  await testing.generate(1)

  address1 = await testing.generateAddress()
  vaultId1 = await testing.rpc.loan.createVault({
    ownerAddress: address1,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.generateAddress(),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.generateAddress(),
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: await testing.generateAddress(),
    loanSchemeId: 'default'
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
  it('should listVaults with size only', async () => {
    const result = await client.loan.listVault(20)
    expect(result.length).toStrictEqual(4)
    result.forEach(e =>
      expect(e).toStrictEqual({
        vaultId: expect.any(String),
        loanSchemeId: 'default',
        ownerAddress: expect.any(String),
        state: 'active',
        informativeRatio: '-1',
        collateralRatio: '-1',
        collateralValue: '0',
        loanValue: '0',
        interestValue: '0',
        collateralAmounts: [],
        loanAmounts: [],
        interestAmounts: []
      })
    )
  })

  it('should listTokens with size and pagination', async () => {
    const list = await client.loan.listVault(20)
    const vaultId0 = list[0].vaultId
    const vaultId1 = list[1].vaultId
    const vaultId2 = list[2].vaultId
    const vaultId3 = list[3].vaultId

    const first = await client.loan.listVault(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(vaultId1)

    expect(first[0].vaultId).toStrictEqual(vaultId0)
    expect(first[1].vaultId).toStrictEqual(vaultId1)

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(vaultId3)

    expect(next[0].vaultId).toStrictEqual(vaultId2)
    expect(next[1].vaultId).toStrictEqual(vaultId3)

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('get', () => {
  it('should get vault by vaultId', async () => {
    const data = await client.loan.getVault(vaultId1)
    expect(data).toStrictEqual({
      vaultId: vaultId1,
      loanSchemeId: 'default',
      ownerAddress: address1,
      state: 'active',
      informativeRatio: '-1',
      collateralRatio: '-1',
      collateralValue: '0',
      loanValue: '0',
      interestValue: '0',
      collateralAmounts: [],
      loanAmounts: [],
      interestAmounts: []
    })
  })

  it('should fail due to getting non-existent vault', async () => {
    expect.assertions(4)
    try {
      await client.loan.getVault('0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find vault',
        url: '/v0.0/regtest/loans/vaults/0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7'
      })
    }

    try {
      await client.loan.getVault('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find vault',
        url: '/v0.0/regtest/loans/vaults/999'
      })
    }
  })

  it('should fail due to id is malformed', async () => {
    expect.assertions(2)
    try {
      await client.loan.getVault('$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        at: expect.any(Number),
        code: 400,
        message: "RpcApiError: 'vaultId must be of length 64 (not 3, for '$*@')', code: -8, method: getvault",
        type: 'BadRequest',
        url: '/v0.0/regtest/loans/vaults/$*@'
      })
    }
  })
})
