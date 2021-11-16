import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { CollateralTokenMapper } from '@src/module.model/collateral.token'
import { createToken } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.generate(20)
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should set collateral data', async () => {
  await container.waitForWalletBalanceGTE(110)
  await createToken(container, 'BTC')
  await container.generate(1)
  await container.waitForWalletBalanceGTE(110)
  await createToken(container, 'ETH')
  await container.generate(1)

  const oracleId1 = await client.oracle.appointOracle(await container.getNewAddress(), [
    { token: 'BTC', currency: 'EUR' },
    { token: 'ETH', currency: 'USD' }
  ], { weightage: 1 })
  await container.generate(1)

  const ts = Math.floor(Date.now() / 1000)
  await client.oracle.setOracleData(oracleId1, ts, {
    prices: [
      { tokenAmount: '50000@BTC', currency: 'EUR' },
      { tokenAmount: '10000@ETH', currency: 'USD' }
    ]
  })
  await container.generate(1)

  const currentHeight = await client.blockchain.getBlockCount()

  await client.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/EUR'
  })
  await client.loan.setCollateralToken({
    token: 'ETH',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'ETH/USD'
  })
  await container.generate(1)

  await client.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.6),
    fixedIntervalPriceId: 'BTC/EUR',
    activateAfterBlock: currentHeight + 10
  })
  await container.generate(2)

  await waitForIndexedHeight(app, currentHeight + 2)

  const full = await app.get(CollateralTokenMapper).query(100)
  expect(full.length).toStrictEqual(3)

  {
    const ethCol = await app.get(CollateralTokenMapper).getActiveCollateralToken(2, 108)
    expect(ethCol).toBeDefined()
    expect(ethCol?.id).toStrictEqual('2-108')
    expect(ethCol?.factor).toStrictEqual('1')
    expect(ethCol?.activateAfterBlock).toStrictEqual(0)
    expect(ethCol?.token?.id).toStrictEqual(2)
    expect(ethCol?.token?.symbol).toStrictEqual('ETH')
    expect(ethCol?.priceFeed).toStrictEqual('ETH/USD')
    expect(ethCol?.block?.height).toStrictEqual(108)
  }

  {
    const btcCol = await app.get(CollateralTokenMapper).getActiveCollateralToken(1, 108)
    expect(btcCol).toBeDefined()
    expect(btcCol?.id).toStrictEqual('1-108')
    expect(btcCol?.factor).toStrictEqual('1')
    expect(btcCol?.activateAfterBlock).toStrictEqual(0)
    expect(btcCol?.token?.id).toStrictEqual(1)
    expect(btcCol?.token?.symbol).toStrictEqual('BTC')
    expect(btcCol?.priceFeed).toStrictEqual('BTC/EUR')
    expect(btcCol?.block?.height).toStrictEqual(108)
  }

  {
    const btcCol = await app.get(CollateralTokenMapper).getActiveCollateralToken(1, 117)
    expect(btcCol).toBeDefined()
    expect(btcCol?.id).toStrictEqual('1-109')
    expect(btcCol?.factor).toStrictEqual('0.6')
    expect(btcCol?.activateAfterBlock).toStrictEqual(117)
    expect(btcCol?.token?.id).toStrictEqual(1)
    expect(btcCol?.token?.symbol).toStrictEqual('BTC')
    expect(btcCol?.priceFeed).toStrictEqual('BTC/EUR')
    expect(btcCol?.block?.height).toStrictEqual(109)
  }

  {
    const btcColHistory = await app.get(CollateralTokenMapper).getCollateralTokenHistory(1)
    expect(btcColHistory.length).toStrictEqual(2)
  }
})
