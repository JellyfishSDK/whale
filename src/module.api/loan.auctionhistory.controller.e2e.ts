import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingAppGroup } from '@src/e2e.module'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { TestingGroup } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

let app: NestFastifyApplication
let controller: LoanController

const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let aliceColAddr: string
let bobColAddr: string
let vaultId1: string // Alice 1st vault
let vaultId2: string // Alice 2nd vault
let vaultId3: string // Bob 1st vault
let vaultId4: string // Bob 2nd vault

beforeAll(async () => {
  await tGroup.start()
  await alice.container.waitForWalletCoinbaseMaturity()
  await alice.container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(alice.container)
  controller = app.get(LoanController)

  aliceColAddr = await alice.generateAddress()
  bobColAddr = await bob.generateAddress()

  await alice.token.dfi({
    address: aliceColAddr,
    amount: 35000
  })
  await alice.generate(1)

  await alice.token.create({
    symbol: 'BTC',
    collateralAddress: aliceColAddr
  })
  await alice.generate(1)

  await alice.token.mint({
    symbol: 'BTC',
    amount: 50
  })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['25@BTC'] })
  await alice.generate(1)
  await tGroup.waitForSync()

  await bob.token.dfi({
    address: bobColAddr,
    amount: 75000
  })
  await bob.generate(1)
  await tGroup.waitForSync()

  // Loan scheme
  await alice.container.call('createloanscheme', [100, 1, 'default'])
  await alice.generate(1)

  // Price oracle
  const addr = await alice.generateAddress()
  const priceFeeds = [
    {
      token: 'DFI',
      currency: 'USD'
    },
    {
      token: 'BTC',
      currency: 'USD'
    },
    {
      token: 'AAPL',
      currency: 'USD'
    },
    {
      token: 'TSLA',
      currency: 'USD'
    },
    {
      token: 'MSFT',
      currency: 'USD'
    },
    {
      token: 'FB',
      currency: 'USD'
    }
  ]
  const oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await alice.generate(1)
  const timestamp = Math.floor(new Date().getTime() / 1000)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '1@DFI',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '10000@BTC',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@AAPL',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@TSLA',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@MSFT',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2@FB',
      currency: 'USD'
    }]
  })
  await alice.generate(1)

  // Collateral tokens
  await alice.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await alice.generate(1)
  await alice.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await alice.generate(1)

  // Loan token
  await alice.rpc.loan.setLoanToken({
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD'
  })
  await alice.generate(1)
  await alice.token.mint({
    symbol: 'AAPL',
    amount: 50000
  })
  await alice.generate(1)

  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await alice.generate(1)
  await alice.token.mint({
    symbol: 'TSLA',
    amount: 50000
  })
  await alice.generate(1)

  await alice.rpc.loan.setLoanToken({
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD'
  })
  await alice.generate(1)
  await alice.token.mint({
    symbol: 'MSFT',
    amount: 50000
  })
  await alice.generate(1)

  await alice.rpc.loan.setLoanToken({
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD'
  })
  await alice.generate(1)
  await alice.token.mint({
    symbol: 'FB',
    amount: 50000
  })
  await alice.generate(1)

  // Vault 1
  vaultId1 = await alice.rpc.container.call('createvault', [await alice.generateAddress(), 'default'])
  await alice.generate(1)

  await alice.container.call('deposittovault', [vaultId1, aliceColAddr, '10000@DFI'])
  await alice.generate(1)
  await alice.container.call('deposittovault', [vaultId1, aliceColAddr, '0.5@BTC'])
  await alice.generate(1)

  await alice.container.call('takeloan', [{
    vaultId: vaultId1,
    amounts: '7500@AAPL'
  }])
  await alice.generate(1)

  // Vault 2
  vaultId2 = await alice.rpc.container.call('createvault', [await alice.generateAddress(), 'default'])
  await alice.generate(1)

  await alice.container.call('deposittovault', [vaultId2, aliceColAddr, '20000@0DFI'])
  await alice.generate(1)
  await alice.container.call('deposittovault', [vaultId2, aliceColAddr, '1@BTC'])
  await alice.generate(1)

  await alice.container.call('takeloan', [{
    vaultId: vaultId2,
    amounts: '15000@TSLA'
  }])
  await alice.generate(1)

  // Vault 3
  vaultId3 = await bob.rpc.container.call('createvault', [await bob.generateAddress(), 'default'])
  await bob.generate(1)

  await bob.container.call('deposittovault', [vaultId3, bobColAddr, '30000@DFI'])
  await bob.generate(1)
  await bob.container.call('deposittovault', [vaultId3, bobColAddr, '1.5@BTC'])
  await bob.generate(1)

  await bob.container.call('takeloan', [{
    vaultId: vaultId3,
    amounts: '22500@MSFT'
  }])
  await bob.generate(1)

  // Vault 4
  vaultId4 = await bob.rpc.container.call('createvault', [await bob.generateAddress(), 'default'])
  await bob.generate(1)

  await bob.container.call('deposittovault', [vaultId4, bobColAddr, '40000@DFI'])
  await bob.generate(1)
  await bob.container.call('deposittovault', [vaultId4, bobColAddr, '2@BTC'])
  await bob.generate(1)

  await bob.container.call('takeloan', [{
    vaultId: vaultId4,
    amounts: '30000@FB'
  }])
  await bob.generate(1)

  {
    // When there is no liquidation occurs
    const data = await alice.container.call('listauctions', [])
    expect(data).toStrictEqual([])

    const vault1 = await alice.rpc.loan.getVault(vaultId1)
    expect(vault1.state).toStrictEqual('active')

    const vault2 = await alice.rpc.loan.getVault(vaultId2)
    expect(vault2.state).toStrictEqual('active')

    const vault3 = await alice.rpc.loan.getVault(vaultId3)
    expect(vault3.state).toStrictEqual('active')

    const vault4 = await alice.rpc.loan.getVault(vaultId4)
    expect(vault4.state).toStrictEqual('active')
  }

  // Going to liquidate the vaults by price increase of the loan tokens
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@AAPL',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.container.waitForActivePrice('AAPL/USD', '2.2')
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@TSLA',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.container.waitForActivePrice('TSLA/USD', '2.2')
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@MSFT',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.container.waitForActivePrice('MSFT/USD', '2.2')
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, {
    prices: [{
      tokenAmount: '2.2@FB',
      currency: 'USD'
    }]
  })
  await alice.generate(1)
  await alice.container.waitForActivePrice('FB/USD', '2.2')
  await alice.generate(1)

  // When there is liquidation
  const list = await alice.container.call('listauctions', [])
  list.forEach((l: { state: any }) =>
    expect(l.state).toStrictEqual('inLiquidation')
  )

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['7875@AAPL'] })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['15750@TSLA'] })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['23625@MSFT'] })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['31500@FB'] })
  await alice.generate(1)

  {
    const txid = await alice.container.call('placeauctionbid', [vaultId1, 0, aliceColAddr, '7875@AAPL'])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await alice.generate(1)
  }

  {
    const txid = await alice.container.call('placeauctionbid', [vaultId2, 1, aliceColAddr, '15750@TSLA'])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await alice.generate(1)
  }

  await tGroup.waitForSync()

  {
    const txid = await bob.container.call('placeauctionbid', [vaultId3, 0, bobColAddr, '23625@MSFT'])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await bob.generate(1)
  }

  {
    const txid = await bob.container.call('placeauctionbid', [vaultId4, 1, bobColAddr, '31500@FB'])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await bob.generate(1)
  }

  await alice.container.generate(80)
  await tGroup.waitForSync()
})

afterAll(async () => {
  await stopTestingAppGroup(tGroup, app)
})

describe('list', () => {
  it('should listAuctionHistory', async () => {
    const result = await controller.listAuctionHistory({ size: 100 })
    expect(result.data.length).toStrictEqual(4)
    result.data.forEach((e: any) => {
      expect(e).toStrictEqual({
        auctionBid: expect.any(String),
        auctionWon: expect.any(Array),
        batchIndex: expect.any(Number),
        blockHash: expect.any(String),
        blockHeight: expect.any(Number),
        blockTime: expect.any(Number),
        winner: expect.any(String),
        vaultId: expect.any(String)
      })
    }
    )
  })
})

it('should listAuctionHistory with pagination', async () => {
  const first = await controller.listAuctionHistory({ size: 2 })
  expect(first.data.length).toStrictEqual(2)
  expect(first.page?.next).toStrictEqual(`${first.data[1].vaultId}${first.data[1].blockHeight}`)

  const next = await controller.listAuctionHistory({
    size: 2,
    next: first.page?.next
  })
  expect(next.data.length).toStrictEqual(2)
  expect(next.page?.next).toStrictEqual(`${next.data[1].vaultId}${next.data[1].blockHeight}`)

  const last = await controller.listAuctionHistory({
    size: 2,
    next: next.page?.next
  })
  expect(last.data.length).toStrictEqual(0)
  expect(last.page).toBeUndefined()
})

it('should listAuctionHistory with an empty object if size 100 next 51f6233c4403f6ce113bb4e90f83b176587f401081605b8a8bb723ff3b0ab5b6 300 which is out of range', async () => {
  const result = await controller.listAuctionHistory({
    size: 100,
    next: '51f6233c4403f6ce113bb4e90f83b176587f401081605b8a8bb723ff3b0ab5b6300'
  })

  expect(result.data.length).toStrictEqual(0)
  expect(result.page).toBeUndefined()
})
