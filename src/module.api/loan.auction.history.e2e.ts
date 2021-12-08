import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanController } from '@src/module.api/loan.controller'
import { TestingGroup, Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { VaultLiquidation } from '@defichain/jellyfish-api-core/dist/category/loan'

let app: NestFastifyApplication
let controller: LoanController

const container = new MasterNodeRegTestContainer()
const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let colAddr: string
let bobColAddr: string
let vaultId: string
// let vaultId1: string

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get(LoanController)

  await setup()
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should listVaultAuctionHistory', async () => {
  const result = await controller.listVaultAuctionHistory(vaultId, 200, 0)
  console.log('result: ', result)
})

async function setup (): Promise<void> {
  colAddr = await alice.generateAddress()
  bobColAddr = await bob.generateAddress()

  await dfi(alice, colAddr, 300000)
  await createToken(alice, 'BTC', colAddr)
  await mintTokens(alice, 'BTC', 50)
  await alice.rpc.account.sendTokensToAddress({}, { [colAddr]: ['25@BTC'] })
  await alice.container.call('createloanscheme', [100, 1, 'default'])
  await alice.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' }
  ]
  const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
  await alice.generate(1)
  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '10000@BTC', currency: 'USD' },
      { tokenAmount: '2@AAPL', currency: 'USD' },
      { tokenAmount: '2@TSLA', currency: 'USD' },
      { tokenAmount: '2@MSFT', currency: 'USD' }
    ]
  })
  await alice.generate(1)

  await setCollateralToken(alice, 'DFI')
  await setCollateralToken(alice, 'BTC')

  await setLoanToken(alice, 'AAPL')
  await setLoanToken(alice, 'TSLA')
  await setLoanToken(alice, 'MSFT')

  const mVaultId = await createVault(alice, 'default')
  await depositToVault(alice, mVaultId, colAddr, '200000@DFI')
  await depositToVault(alice, mVaultId, colAddr, '20@BTC')
  await takeLoan(alice, mVaultId, ['60000@TSLA', '60000@AAPL', '60000@MSFT'])

  await alice.rpc.account.sendTokensToAddress({}, { [colAddr]: ['30000@TSLA', '30000@AAPL', '30000@MSFT'] })
  await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['30000@TSLA', '30000@AAPL', '30000@MSFT'] })
  await alice.generate(1)
  await tGroup.waitForSync()

  vaultId = await createVault(alice, 'default')
  await depositToVault(alice, vaultId, colAddr, '10000@DFI')
  await depositToVault(alice, vaultId, colAddr, '1@BTC')
  await takeLoan(alice, vaultId, '7500@AAPL')
  await takeLoan(alice, vaultId, '2500@TSLA')

  // vaultId1 = await createVault(alice, 'default')
  // await depositToVault(alice, vaultId1, colAddr, '20000@DFI')
  // await depositToVault(alice, vaultId1, colAddr, '1@BTC')
  // await takeLoan(alice, vaultId1, '15000@TSLA')

  // const vaultId2 = await createVault(alice, 'default')
  // await depositToVault(alice, vaultId2, colAddr, '30000@DFI')
  // await depositToVault(alice, vaultId2, colAddr, '1.5@BTC')
  // await takeLoan(alice, vaultId2, '22500@MSFT')

  {
    // When there is no liquidation occurs
    const data = await alice.container.call('listauctions', [])
    expect(data).toStrictEqual([])

    const list = await alice.container.call('listauctions')
    expect(list.every((each: any) => each.state === 'active'))
  }

  // liquidated
  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '2.2@AAPL', currency: 'USD' },
      { tokenAmount: '2.2@TSLA', currency: 'USD' },
      { tokenAmount: '2.2@MSFT', currency: 'USD' }
    ]
  })
  await alice.container.generate(13)

  {
    const list = await alice.container.call('listauctions')
    expect(list.every((each: any) => each.state === 'inLiquidation'))
  }

  let vault = await alice.rpc.loan.getVault(vaultId) as VaultLiquidation
  console.log('vault: ', vault)
  console.log('vault: ', vault.batches)

  // BID WAR!!
  // vaultId[0]
  await placeAuctionBid(alice, vaultId, 0, colAddr, '5300@AAPL')
  await tGroup.waitForSync()
  await placeAuctionBid(bob, vaultId, 0, bobColAddr, '5355@AAPL')
  await tGroup.waitForSync()
  await placeAuctionBid(alice, vaultId, 0, colAddr, '5408.55@AAPL')
  await tGroup.waitForSync()

  // vaultId[1]
  await placeAuctionBid(alice, vaultId, 1, colAddr, '2700.00012@AAPL')
  await tGroup.waitForSync()
  await placeAuctionBid(bob, vaultId, 1, bobColAddr, '2730@AAPL')
  await tGroup.waitForSync()
  await placeAuctionBid(alice, vaultId, 1, colAddr, '2760.0666069@AAPL')
  await tGroup.waitForSync()

  // vaultId[2]
  await placeAuctionBid(alice, vaultId, 2, colAddr, '2625.00499422@TSLA')
  await tGroup.waitForSync()

  // do another batch
  await alice.generate(40)
  await tGroup.waitForSync()

  vault = await alice.rpc.loan.getVault(vaultId) as VaultLiquidation
  console.log('vault 2: ', vault)
  console.log('vault 2: ', vault.batches)

  // vaultId1 = await createVault(alice, 'default')
  // await depositToVault(alice, vaultId, colAddr, '10000@DFI')
  // await depositToVault(alice, vaultId, colAddr, '1@BTC')
  // await takeLoan(alice, vaultId, '7500@AAPL')
  // await takeLoan(alice, vaultId, '2500@TSLA')

  // const vault1 = await alice.rpc.loan.getVault(vaultId1) as VaultLiquidation
  // console.log('vault1: ', vault1)
  // console.log('vault1: ', vault1.batches)

  // // BID WAR #2!!
  // // vaultId[0]
  // await placeAuctionBid(alice, vaultId, 0, colAddr, '5300.123@AAPL')
  // await tGroup.waitForSync()
  // await placeAuctionBid(bob, vaultId, 0, bobColAddr, '5355.123@AAPL')
  // await tGroup.waitForSync()
  // await placeAuctionBid(alice, vaultId, 0, colAddr, '5408.55123@AAPL')
  // await tGroup.waitForSync()
}

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
async function placeAuctionBid (testing: Testing, vaultId: string, index: number, addr: string, tokenAmt: string): Promise<void> {
  await testing.container.call('placeauctionbid', [vaultId, index, addr, tokenAmt])
  await testing.generate(1)
}
