// import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { LoanMasterNodeRegTestContainer } from '../../../../src/module.api/loan_container'

let container = new LoanMasterNodeRegTestContainer()
let service: StubService
let client: WhaleApiClient

let address1: string
// let address2: string
// let address3: string
// let address4: string

let vaultId1: string
// let vaultId2: string
// let vaultId3: string
// let vaultId4: string

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
  // address2 =  await testing.generateAddress()
  // address3 =  await testing.generateAddress()
  // address4 =  await testing.generateAddress()

  vaultId1 = await testing.rpc.loan.createVault({
    ownerAddress: address1,
    loanSchemeId: 'default'
  })
  await testing.generate(1)
  //
  // vaultId2 = await testing.rpc.loan.createVault({
  //   ownerAddress: address2,
  //   loanSchemeId: 'default'
  // })
  // await testing.generate(1)
  //
  // vaultId3 = await testing.rpc.loan.createVault({
  //   ownerAddress: address3,
  //   loanSchemeId: 'default'
  // })
  // await testing.generate(1)
  //
  // vaultId4 = await testing.rpc.loan.createVault({
  //   ownerAddress: address4,
  //   loanSchemeId: 'default'
  // })
  // await testing.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

// describe('list', () => {
//   it('should listTokens', async () => {
//     const result = await client.tokens.list()
//     expect(result.length).toStrictEqual(4)
//     expect(result[0]).toStrictEqual({
//       id: '0',
//       symbol: 'DFI',
//       symbolKey: 'DFI',
//       displaySymbol: 'DFI',
//       name: 'Default Defi token',
//       decimal: 8,
//       limit: '0',
//       mintable: false,
//       tradeable: true,
//       isDAT: true,
//       isLPS: false,
//       finalized: true,
//       minted: '0',
//       creation: {
//         tx: '0000000000000000000000000000000000000000000000000000000000000000',
//         height: 0
//       },
//       destruction: {
//         tx: '0000000000000000000000000000000000000000000000000000000000000000',
//         height: -1
//       }
//     })
//   })
//
//   it('should listTokens with pagination', async () => {
//     const first = await client.tokens.list(2)
//
//     expect(first.length).toStrictEqual(2)
//     expect(first.hasNext).toStrictEqual(true)
//     expect(first.nextToken).toStrictEqual('1')
//
//     expect(first[0]).toStrictEqual(expect.objectContaining({ id: '0', symbol: 'DFI', symbolKey: 'DFI' }))
//     expect(first[1]).toStrictEqual(expect.objectContaining({ id: '1', symbol: 'DBTC', symbolKey: 'DBTC' }))
//
//     const next = await client.paginate(first)
//
//     expect(next.length).toStrictEqual(2)
//     expect(next.hasNext).toStrictEqual(true)
//     expect(next.nextToken).toStrictEqual('3')
//
//     expect(next[0]).toStrictEqual(expect.objectContaining({ id: '2', symbol: 'DETH', symbolKey: 'DETH' }))
//     expect(next[1]).toStrictEqual(expect.objectContaining({ id: '3', symbol: 'DBTC-DET', symbolKey: 'DBTC-DET' }))
//
//     const last = await client.paginate(next)
//
//     expect(last.length).toStrictEqual(0)
//     expect(last.hasNext).toStrictEqual(false)
//     expect(last.nextToken).toBeUndefined()
//   })
// })

describe('get', () => {
  it('should get vault by vault id', async () => {
    const data = await client.loan.getVault(vaultId1)
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
      await client.loan.getVault('0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find vault',
        url: '/v0.0/regtest/loan/vault/0530ab29a9f09416a014a4219f186f1d5d530e9a270a9f941275b3972b43ebb7'
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
        url: '/v0.0/regtest/loan/vault/999'
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
        url: '/v0.0/regtest/loan/vault/$*@'
      })
    }
  })
})
