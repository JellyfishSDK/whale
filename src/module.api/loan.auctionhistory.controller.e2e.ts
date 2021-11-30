import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingAppGroup } from '@src/e2e.module'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { TestingGroup, Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

let app: NestFastifyApplication
let controller: LoanController

const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)

beforeAll(async () => {
  await tGroup.start()
  await alice.container.waitForWalletCoinbaseMaturity()
  app = await createTestingApp(alice.container)
  controller = app.get(LoanController)
  const aliceColAddr = await alice.generateAddress()
  const bobColAddr = await bob.generateAddress()

  await dfi(alice, aliceColAddr, 35000)
  await createToken(alice, 'BTC', aliceColAddr)
  await mintTokens(alice, 'BTC', 50)
  await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['25@BTC'] })
  await alice.container.call('createloanscheme', [100, 1, 'default'])
  await alice.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' }
  ]
  const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '10000@BTC', currency: 'USD' },
      { tokenAmount: '2@AAPL', currency: 'USD' },
      { tokenAmount: '2@TSLA', currency: 'USD' },
      { tokenAmount: '2@MSFT', currency: 'USD' },
      { tokenAmount: '2@FB', currency: 'USD' }
    ]
  })
  await alice.generate(1)

  await setCollateralToken(alice, 'DFI')
  await setCollateralToken(alice, 'BTC')

  await setLoanToken(alice, 'AAPL')
  await setLoanToken(alice, 'TSLA')
  await setLoanToken(alice, 'MSFT')
  await setLoanToken(alice, 'FB')

  await mintTokens(alice, 'AAPL', 50000)
  await mintTokens(alice, 'TSLA', 50000)
  await mintTokens(alice, 'MSFT', 50000)
  await mintTokens(alice, 'FB', 50000)

  const vaultId1 = await createVault(alice, 'default')
  await depositToVault(alice, vaultId1, aliceColAddr, '10000@DFI')
  await depositToVault(alice, vaultId1, aliceColAddr, '0.5@BTC')
  await takeLoan(alice, vaultId1, '7500@AAPL')

  const vaultId2 = await createVault(alice, 'default')
  await depositToVault(alice, vaultId2, aliceColAddr, '20000@DFI')
  await depositToVault(alice, vaultId2, aliceColAddr, '1@BTC')
  await takeLoan(alice, vaultId2, '15000@TSLA')
  await tGroup.waitForSync()

  await dfi(bob, bobColAddr, 75000)

  const vaultId3 = await createVault(bob, 'default')
  await depositToVault(bob, vaultId3, bobColAddr, '30000@DFI')
  await depositToVault(bob, vaultId3, bobColAddr, '1.5@BTC')
  await takeLoan(bob, vaultId3, '22500@MSFT')

  const vaultId4 = await createVault(bob, 'default')
  await depositToVault(bob, vaultId4, bobColAddr, '40000@DFI')
  await depositToVault(bob, vaultId4, bobColAddr, '2@BTC')
  await takeLoan(bob, vaultId4, '30000@FB')
  await tGroup.waitForSync()

  {
    // When there is no liquidation occurs
    const data = await alice.container.call('listauctions', [])
    expect(data).toStrictEqual([])

    const list = await alice.container.call('listauctions')
    expect(list.every((each: any) => each.state === 'active'))
  }

  // Going to liquidate the vaults by price increase of the loan tokens
  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [{ tokenAmount: '2.2@AAPL', currency: 'USD' }]
  })
  // await alice.container.waitForActivePrice('AAPL/USD', '2.2')

  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [{ tokenAmount: '2.2@TSLA', currency: 'USD' }]
  })
  // await alice.container.waitForActivePrice('TSLA/USD', '2.2')

  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [{ tokenAmount: '2.2@MSFT', currency: 'USD' }]
  })
  // await alice.container.waitForActivePrice('MSFT/USD', '2.2')

  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [{ tokenAmount: '2.2@FB', currency: 'USD' }]
  })
  // await alice.container.waitForActivePrice('FB/USD', '2.2')
  await alice.container.generate(13)

  { // When there is liquidation
    const list = await alice.container.call('listauctions')
    expect(list.every((each: any) => each.state === 'inLiquidation'))
  }

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['7875@AAPL', '15750@TSLA'] })
  await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['23625@MSFT', '31500@FB'] })
  await alice.generate(1)

  await alice.container.call('placeauctionbid', [vaultId1, 0, aliceColAddr, '7875@AAPL'])
  await alice.container.call('placeauctionbid', [vaultId2, 1, aliceColAddr, '15750@TSLA'])
  await alice.generate(1)
  await tGroup.waitForSync()

  await bob.container.call('placeauctionbid', [vaultId3, 0, bobColAddr, '23625@MSFT'])
  await bob.container.call('placeauctionbid', [vaultId4, 1, bobColAddr, '31500@FB'])
  await bob.generate(40)
  await tGroup.waitForSync()
})

afterAll(async () => {
  await stopTestingAppGroup(tGroup, app)
})

it.only('should listAuctionHistory', async () => {
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

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}
async function dfi (testing: Testing, address: string, amount: number): Promise<void> {
  await testing.token.dfi({
    address: address,
    amount: amount
  })
  await testing.generate(1)
}
async function createToken (testing: Testing, symbol: string, address: string): Promise<void> {
  await testing.token.create({
    symbol: symbol,
    collateralAddress: address
  })
  await testing.generate(1)
}
async function mintTokens (testing: Testing, symbol: string, amount: number): Promise<void> {
  await testing.token.mint({
    symbol: symbol,
    amount: amount
  })
  await testing.generate(1)
}
async function setCollateralToken (testing: Testing, symbol: string): Promise<void> {
  await testing.rpc.loan.setCollateralToken({
    token: symbol,
    factor: new BigNumber(1),
    fixedIntervalPriceId: `${symbol}/USD`
  })
  await testing.generate(1)
}
async function setLoanToken (testing: Testing, symbol: string): Promise<void> {
  await testing.rpc.loan.setLoanToken({
    symbol: symbol,
    fixedIntervalPriceId: `${symbol}/USD`
  })
  await testing.generate(1)
}
async function createVault (testing: Testing, schemeId: string, address?: string): Promise<string> {
  const vaultId = await testing.rpc.container.call(
    'createvault', [address ?? await testing.generateAddress(), schemeId]
  )
  await testing.generate(1)
  return vaultId
}
async function depositToVault (testing: Testing, vaultId: string, address: string, tokenAmt: string): Promise<void> {
  await testing.rpc.container.call('deposittovault', [vaultId, address, tokenAmt])
  await testing.generate(1)
}
async function takeLoan (testing: Testing, vaultId: string, amounts: string | string[]): Promise<void> {
  await testing.rpc.container.call('takeloan', [{ vaultId, amounts }])
  await testing.generate(1)
}
