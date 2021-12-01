import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

let app: NestFastifyApplication
let controller: LoanController
const testing = Testing.create(new MasterNodeRegTestContainer())

beforeAll(async () => {
  await testing.container.waitForWalletCoinbaseMaturity()
  app = await createTestingApp(testing.container)
  controller = app.get(LoanController)
  const colAddr = await testing.generateAddress()

  await dfi(testing, colAddr, 300000)
  await createToken(testing, 'BTC', colAddr)
  await mintTokens(testing, 'BTC', 50)
  await testing.rpc.account.sendTokensToAddress({}, { [colAddr]: ['25@BTC'] })
  await testing.container.call('createloanscheme', [100, 1, 'default'])
  await testing.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' },
    { token: 'META', currency: 'USD' },
    { token: 'GOOGL', currency: 'USD' },
    { token: 'AMZN', currency: 'USD' },
    { token: 'TWTR', currency: 'USD' }
  ]
  const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), priceFeeds, { weightage: 1 })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '10000@BTC', currency: 'USD' },
      { tokenAmount: '2@AAPL', currency: 'USD' },
      { tokenAmount: '2@TSLA', currency: 'USD' },
      { tokenAmount: '2@MSFT', currency: 'USD' },
      { tokenAmount: '2@FB', currency: 'USD' },
      { tokenAmount: '2@META', currency: 'USD' },
      { tokenAmount: '2@GOOGL', currency: 'USD' },
      { tokenAmount: '2@AMZN', currency: 'USD' },
      { tokenAmount: '2@TWTR', currency: 'USD' }
    ]
  })
  await testing.generate(1)

  await setCollateralToken(testing, 'DFI')
  await setCollateralToken(testing, 'BTC')

  await setLoanToken(testing, 'AAPL')
  await setLoanToken(testing, 'TSLA')
  await setLoanToken(testing, 'MSFT')
  await setLoanToken(testing, 'FB')
  await setLoanToken(testing, 'META')
  await setLoanToken(testing, 'GOOGL')
  await setLoanToken(testing, 'AMZN')
  await setLoanToken(testing, 'TWTR')

  await mintTokens(testing, 'AAPL', 50000)
  await mintTokens(testing, 'TSLA', 50000)
  await mintTokens(testing, 'MSFT', 50000)
  await mintTokens(testing, 'FB', 50000)
  await mintTokens(testing, 'META', 50000)
  await mintTokens(testing, 'GOOGL', 50000)
  await mintTokens(testing, 'AMZN', 50000)
  await mintTokens(testing, 'TWTR', 50000)

  const vaultId = await createVault(testing, 'default')
  await depositToVault(testing, vaultId, colAddr, '10000@DFI')
  await depositToVault(testing, vaultId, colAddr, '0.5@BTC')
  await takeLoan(testing, vaultId, '7500@AAPL')

  const vaultId1 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId1, colAddr, '20000@DFI')
  await depositToVault(testing, vaultId1, colAddr, '1@BTC')
  await takeLoan(testing, vaultId1, '15000@TSLA')

  const vaultId2 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId2, colAddr, '30000@DFI')
  await depositToVault(testing, vaultId2, colAddr, '1.5@BTC')
  await takeLoan(testing, vaultId2, '22500@MSFT')

  const vaultId3 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId3, colAddr, '40000@DFI')
  await depositToVault(testing, vaultId3, colAddr, '2@BTC')
  await takeLoan(testing, vaultId3, '30000@FB')

  const vaultId4 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId4, colAddr, '40000@DFI')
  await depositToVault(testing, vaultId4, colAddr, '2@BTC')
  await takeLoan(testing, vaultId4, '30000@META')

  const vaultId5 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId5, colAddr, '40000@DFI')
  await depositToVault(testing, vaultId5, colAddr, '2@BTC')
  await takeLoan(testing, vaultId5, '30000@GOOGL')

  const vaultId6 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId6, colAddr, '40000@DFI')
  await depositToVault(testing, vaultId6, colAddr, '2@BTC')
  await takeLoan(testing, vaultId6, '30000@AMZN')

  const vaultId7 = await createVault(testing, 'default')
  await depositToVault(testing, vaultId7, colAddr, '40000@DFI')
  await depositToVault(testing, vaultId7, colAddr, '2@BTC')
  await takeLoan(testing, vaultId7, '30000@TWTR')
  {
    // When there is no liquidation occurs
    const data = await testing.container.call('listauctions', [])
    expect(data).toStrictEqual([])

    const list = await testing.container.call('listauctions')
    expect(list.every((each: any) => each.state === 'active'))
  }

  // Going to liquidate the vaults by price increase of the loan tokens
  // make diff block liquidated
  await testing.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '2.2@META', currency: 'USD' }] })
  await testing.container.waitForActivePrice('META/USD', '2.2')
  await testing.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '2.2@GOOGL', currency: 'USD' }] })
  await testing.container.waitForActivePrice('GOOGL/USD', '2.2')
  await testing.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '2.2@AMZN', currency: 'USD' }] })
  await testing.container.waitForActivePrice('AMZN/USD', '2.2')

  // same block liquidated
  await testing.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '2.2@AAPL', currency: 'USD' },
      { tokenAmount: '2.2@TSLA', currency: 'USD' },
      { tokenAmount: '2.2@MSFT', currency: 'USD' },
      { tokenAmount: '2.2@FB', currency: 'USD' }
    ]
  })
  await testing.container.generate(13)

  // another block liquidated
  await testing.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '2.2@TWTR', currency: 'USD' }] })
  await testing.container.waitForActivePrice('TWTR/USD', '2.2')

  { // When there is liquidation
    const list = await testing.container.call('listauctions')
    expect(list.every((each: any) => each.state === 'inLiquidation'))
  }

  await testing.rpc.account.sendTokensToAddress({}, {
    [colAddr]: ['7875@AAPL', '15750@TSLA', '23625@MSFT', '31500@FB', '31500@META', '31500@GOOGL', '31500@AMZN', '31500@TWTR']
  })
  await testing.generate(1)

  await testing.container.call('placeauctionbid', [vaultId, 0, colAddr, '7875@AAPL'])
  await testing.container.call('placeauctionbid', [vaultId1, 1, colAddr, '15750@TSLA'])
  await testing.container.call('placeauctionbid', [vaultId2, 0, colAddr, '23625@MSFT'])
  await testing.container.call('placeauctionbid', [vaultId3, 1, colAddr, '31500@FB'])
  await testing.container.call('placeauctionbid', [vaultId4, 1, colAddr, '31500@META'])
  await testing.container.call('placeauctionbid', [vaultId5, 1, colAddr, '31500@GOOGL'])
  await testing.container.call('placeauctionbid', [vaultId6, 1, colAddr, '31500@AMZN'])
  await testing.container.call('placeauctionbid', [vaultId7, 1, colAddr, '31500@TWTR'])
  await testing.generate(40)
})

afterAll(async () => {
  await stopTestingApp(testing.container, app)
})

it.only('should listAuctionHistory', async () => {
  const result = await controller.listAuctionHistory({ size: 100 })
  console.log('result: ', result)
  expect(result.data.length).toStrictEqual(8)
  expect(result.data.every((e: any) => e === {
    winner: expect.any(String),
    blockHeight: expect.any(Number),
    blockHash: expect.any(String),
    blockTime: expect.any(Number),
    vaultId: expect.any(String),
    batchIndex: expect.any(Number),
    auctionBid: expect.any(String),
    auctionWon: expect.any(Array)
  }))
})

it('should listAuctionHistory with pagination', async () => {
  const first = await controller.listAuctionHistory({ size: 3 })
  console.log('first: ', first)
  expect(first.data.length).toStrictEqual(3)
  expect(first.page?.next).toStrictEqual(`${first.data[2].vaultId}${first.data[2].blockHeight}`)

  const next = await controller.listAuctionHistory({
    size: 3,
    next: first.page?.next
  })
  console.log('next: ', next)
  expect(next.data.length).toStrictEqual(3)
  expect(next.page?.next).toStrictEqual(`${next.data[2].vaultId}${next.data[2].blockHeight}`)

  const last = await controller.listAuctionHistory({
    size: 3,
    next: next.page?.next
  })
  console.log('last: ', last)
  expect(last.data.length).toStrictEqual(2)
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
