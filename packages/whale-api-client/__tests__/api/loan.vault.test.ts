import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from './loan_container'

let container: LoanMasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

let address1: string
let address2: string
let address3: string
let address4: string

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
  address2 = await testing.generateAddress()
  address3 = await testing.generateAddress()
  address4 = await testing.generateAddress()

  vaultId1 = await testing.rpc.loan.createVault({
    ownerAddress: address1,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: address2,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: address3,
    loanSchemeId: 'default'
  })
  await testing.generate(1)

  await testing.rpc.loan.createVault({
    ownerAddress: address4,
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
  it('should listVaults', async () => {
    const result = await client.loanVault.list()
    console.log(result)
    // expect(result.length).toStrictEqual(4)
  })

  it('should listTokens with pagination', async () => {
    const first = await client.loanVault.list(2)
    console.log(first)
    //
    // const vaultId0 = list.data[0].vaultId
    // const vaultId1 = list.data[1].vaultId
    // const vaultId2 = list.data[2].vaultId
    // const vaultId3 = list.data[3].vaultId
    //
    // const first = await controller.list(
    //   container,
    //   { size: 2 }
    // )
    //
    // expect(first.length).toStrictEqual(2)
    // expect(first.hasNext).toStrictEqual(true)
    // expect(first.nextToken).toStrictEqual('1')
    //
    // expect(first[0]).toStrictEqual(vaultId0)
    // expect(first[1]).toStrictEqual(vaultId1)
    //
    // const next = await client.paginate(first)
    //
    // expect(next.length).toStrictEqual(2)
    // expect(next.hasNext).toStrictEqual(true)
    // expect(next.nextToken).toStrictEqual('1')
    //
    // expect(next[0]).toStrictEqual(vaultId2)
    // expect(next[1]).toStrictEqual(vaultId3)
    //
    // const last = await controller.list(container,{
    //   size: 2,
    //   next: next.page?.next
    // })
    //
    // expect(last.data.length).toStrictEqual(0)
    // expect(last.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get vault by vault id', async () => {
    const data = await client.loanVault.get(vaultId1)
    expect(data).toStrictEqual({
      loanSchemeId: 'default',
      ownerAddress: address1,
      isUnderLiquidation: false,
      collateralAmounts: [],
      loanAmount: [],
      collateralValue: expect.any(Number),
      loanValue: expect.any(Number),
      currentRatio: expect.any(Number)
    })
  })

  it('should fail due to getting non-existent token', async () => {
    expect.assertions(4)
    try {
      await client.loanVault.get('0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7')
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
      await client.loanVault.get('999')
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
      await client.loanVault.get('$*@')
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
