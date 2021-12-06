import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { VaultMapper, Vault } from '@src/module.model/vault'
// import { VaultHistoryMapper } from '@src/module.model/vault.history'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { VaultActive, VaultState } from '@defichain/jellyfish-api-core/dist/category/loan'
import { HexEncoder } from '@src/module.model/_hex.encoder'

let app: NestFastifyApplication
const testing = Testing.create(new MasterNodeRegTestContainer())
let vaultId: string
let vaultAddr: string
let block: any
let vaultMapper: VaultMapper
// let vaultHistoryMapper: VaultHistoryMapper

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await testing.container.waitForWalletBalanceGTE(100)
  app = await createTestingApp(testing.container)
  vaultMapper = app.get(VaultMapper)
  // vaultHistoryMapper = app.get(VaultHistoryMapper)

  const colAddr = await testing.generateAddress()
  await dfi(testing, colAddr, 300000)

  await createToken(testing, 'BTC', colAddr)
  await mintTokens(testing, 'BTC', 50)
  await testing.rpc.account.sendTokensToAddress({}, { [colAddr]: ['50@BTC'] })

  await createToken(testing, 'ETH', colAddr)
  await mintTokens(testing, 'ETH', 50)
  await testing.rpc.account.sendTokensToAddress({}, { [colAddr]: ['50@ETH'] })

  await testing.container.call('createloanscheme', [100, 1, 'default'])
  await testing.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'ETH', currency: 'USD' },
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' }
  ]
  const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), priceFeeds, { weightage: 1 })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '10000@BTC', currency: 'USD' },
      { tokenAmount: '400@ETH', currency: 'USD' },
      { tokenAmount: '2@AAPL', currency: 'USD' },
      { tokenAmount: '2@TSLA', currency: 'USD' },
      { tokenAmount: '2@MSFT', currency: 'USD' }
    ]
  })
  await testing.generate(1)

  await setCollateralToken(testing, 'DFI')
  await setCollateralToken(testing, 'BTC')
  await setCollateralToken(testing, 'ETH')

  await setLoanToken(testing, 'AAPL')
  await setLoanToken(testing, 'TSLA')
  await setLoanToken(testing, 'MSFT')

  vaultAddr = await testing.generateAddress()
  vaultId = await createVault(testing, 'default', vaultAddr)
  const height = await testing.container.getBlockCount()
  const hash = await testing.container.call('getblockhash', [height])
  block = await testing.container.call('getblock', [hash])

  // manually index
  await vaultMapper.put({
    id: vaultId,
    sort: HexEncoder.encodeHeight(block.height),
    loanSchemeId: 'default',
    ownerAddress: vaultAddr,
    state: VaultState.ACTIVE,
    collateralAmounts: [],
    loanAmounts: [],
    interestAmounts: [],
    collateralValue: '0',
    loanValue: '0',
    interestValue: '0',
    informativeRatio: '0',
    collateralRatio: -1,
    block: { hash: block.hash, height: block.height, medianTime: block.medianTime, time: block.time }
  })
  await depositToVault(testing, vaultId, colAddr, '10000@DFI')
  await depositToVault(testing, vaultId, colAddr, '0.5@BTC')
  await depositToVault(testing, vaultId, colAddr, '300@DFI')

  await takeLoan(testing, vaultId, '7500@AAPL')
  const vault = await testing.rpc.loan.getVault(vaultId) as VaultActive
  const indexed = await vaultMapper.get(vaultId) as Vault
  // index for takeLoan to calculate the collateralRatio
  await vaultMapper.put({
    ...indexed,
    interestValue: vault.interestValue.toString(),
    interestAmounts: vault.interestAmounts.map(amt => {
      return {
        token: amt.split('@')[0],
        currency: amt.split('@')[1]
      }
    }),
    loanValue: vault.loanValue.toString(),
    loanAmounts: vault.loanAmounts.map(amt => {
      return {
        token: amt.split('@')[0],
        currency: amt.split('@')[1]
      }
    })
  })
  await depositToVault(testing, vaultId, colAddr, '0.456@ETH')

  // const vaultId1 = await createVault(testing, 'default')
  // await depositToVault(testing, vaultId1, colAddr, '20000@DFI')
  // await depositToVault(testing, vaultId1, colAddr, '1@BTC')
})

afterAll(async () => {
  await stopTestingApp(testing.container, app)
})

describe('deposit to vault', () => {
  it('should index depositToVault', async () => {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)

    const vault = await vaultMapper.get(vaultId) as Vault
    expect(vault).toStrictEqual({
      id: vaultId,
      sort: '00000079',
      loanSchemeId: 'default',
      ownerAddress: vaultAddr,
      state: VaultState.ACTIVE,
      collateralAmounts: [
        { token: '10300', currency: 'DFI' },
        { token: '0.5', currency: 'BTC' },
        { token: '0.456', currency: 'ETH' }
      ],
      loanAmounts: [{ token: '7500.00142694', currency: 'AAPL' }],
      interestAmounts: [{ token: '0.00142694', currency: 'AAPL' }],
      collateralValue: '15482.4',
      loanValue: '15000.00285388',
      interestValue: '0.00285388',
      informativeRatio: '103.215980362265197583',
      collateralRatio: 103,
      block: expect.any(Object)
    })

    // to compare indexed data with blockchain data
    const vaultRPC = await testing.rpc.loan.getVault(vaultId) as VaultActive
    expect(vaultRPC).toStrictEqual({
      vaultId: 'afdf7972997f07b1a5ac5af28d12bcb09fdbf5a32dd30f3100a672d214b71581',
      loanSchemeId: 'default',
      ownerAddress: 'bcrt1qmuq8mtw7qk9klpej2v2waqzxj4gg3yzpljsw06',
      state: 'active',
      collateralAmounts: ['10300.00000000@DFI', '0.50000000@BTC', '0.45600000@ETH'],
      loanAmounts: ['7500.00428082@AAPL'],
      interestAmounts: ['0.00428082@AAPL'],
      collateralValue: new BigNumber(15482.4),
      loanValue: new BigNumber(15000.00856164),
      interestValue: new BigNumber(0.00856164),
      informativeRatio: new BigNumber(103.21594108),
      collateralRatio: 103
    })

    // TODO(canonbrother): add VaultHistoryEvent.TAKE_LOAN
    // const history = await vaultHistoryMapper.query(vault.id, 30)
    // console.log('history: ', history)
  })
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
