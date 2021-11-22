import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { VaultDepositMapper } from '@src/module.model/vault.deposit'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

let app: NestFastifyApplication
const testing = Testing.create(new MasterNodeRegTestContainer())
const priceFeeds = [
  { token: 'DFI', currency: 'USD' },
  { token: 'BTC', currency: 'USD' },
  { token: 'TSLA', currency: 'USD' }
]
let vaultId: string

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await testing.container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(testing.container)

  await setup()
})

afterAll(async () => {
  await stopTestingApp(testing.container, app)
})

async function setup (): Promise<void> {
  const colAddr = await testing.generateAddress()
  await testing.token.dfi({ address: colAddr, amount: 30000 })
  await testing.generate(1)
  await testing.token.create({ symbol: 'BTC', collateralAddress: colAddr })
  await testing.generate(1)
  await testing.token.mint({ symbol: 'BTC', amount: 30000 })
  await testing.generate(1)

  const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), priceFeeds, { weightage: 1 })
  await testing.generate(1)
  const now = Math.floor(new Date().getTime() / 1000)
  await testing.rpc.oracle.setOracleData(
    oracleId,
    now,
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '60000@BTC', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' }
      ]
    })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await testing.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await testing.generate(1)

  const vaultAddr = await testing.generateAddress()
  vaultId = await testing.rpc.loan.createVault({
    ownerAddress: vaultAddr,
    loanSchemeId: 'scheme'
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId, from: colAddr, amount: '100@DFI'
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId, from: colAddr, amount: '2@BTC'
  })
  await testing.generate(1)
}

describe('deposit to vault', () => {
  it('should index depositToVault', async () => {
    const height = await testing.container.call('getblockcount')
    await testing.container.generate(1)
    await waitForIndexedHeight(app, height)

    const vaultDepositMapper = app.get(VaultDepositMapper)
    const result = await vaultDepositMapper.query(vaultId, 30)
    console.log('result: ', result)
    // expect(result.length).toStrictEqual(3)
  })
})
