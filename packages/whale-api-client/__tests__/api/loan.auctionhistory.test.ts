import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'

const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)

const service = new StubService(alice.container)
const client = new StubWhaleApiClient(service)

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
  await service.start()

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
  try {
    await service.stop()
  } finally {
    await tGroup.stop()
  }
})

describe('list', () => {
  it('should listAuctionHistory', async () => {
    const result = await client.loan.listAuctionHistory()
    expect(result.length).toStrictEqual(4)
    result.forEach((e: any) => {
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

  it('should listAuctionHistory with pagination', async () => {
    const auctionList = await client.loan.listAuctionHistory()
    const first = await client.loan.listAuctionHistory(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(`${first[1].vaultId}${first[1].blockHeight}`)

    expect(first[0].vaultId).toStrictEqual(auctionList[0].vaultId)
    expect(first[1].vaultId).toStrictEqual(auctionList[1].vaultId)

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(`${next[1].vaultId}${next[1].blockHeight}`)

    expect(next[0].vaultId).toStrictEqual(auctionList[2].vaultId)
    expect(next[1].vaultId).toStrictEqual(auctionList[3].vaultId)

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})
