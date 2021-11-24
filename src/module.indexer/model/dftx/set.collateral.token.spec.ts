import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { CollateralToken, CollateralTokenMapper } from '@src/module.model/collateral.token'
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

  const activationHeight = currentHeight + 10
  await client.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.6),
    fixedIntervalPriceId: 'BTC/EUR',
    activateAfterBlock: activationHeight
  })
  await container.generate(2)

  await waitForIndexedHeight(app, currentHeight + 2)

  const full = await app.get(CollateralTokenMapper).listAll(100)
  expect(full.length).toStrictEqual(2)

  { // before activate
    const ethCol = await app.get(CollateralTokenMapper).getMapper().get('2') as CollateralToken
    expect(ethCol).toBeDefined()
    expect(ethCol.id).toStrictEqual('2')
    expect(ethCol.factor).toStrictEqual('1')
    expect(ethCol.activationHeight).toStrictEqual(0)
    expect(ethCol.token?.id).toStrictEqual(2)
    expect(ethCol.token?.symbol).toStrictEqual('ETH')
    expect(ethCol.tokenCurrency).toStrictEqual('ETH-USD')
    expect(ethCol.block?.height).toStrictEqual(108)
    expect(ethCol).toStrictEqual(full.find(ct => ct.id === '2'))

    const btcCol = await app.get(CollateralTokenMapper).getMapper().get('1') as CollateralToken
    expect(btcCol).toBeDefined()
    expect(btcCol.id).toStrictEqual('1')
    expect(btcCol.factor).toStrictEqual('1')
    expect(btcCol.activationHeight).toStrictEqual(0)
    expect(btcCol.token?.id).toStrictEqual(1)
    expect(btcCol.token?.symbol).toStrictEqual('BTC')
    expect(btcCol.tokenCurrency).toStrictEqual('BTC-EUR')
    expect(btcCol.block?.height).toStrictEqual(108)
    expect(btcCol).toStrictEqual(full.find(ct => ct.id === '1'))

    const completed = await app.get(CollateralTokenMapper).getDeferredMapper().query(true, activationHeight)
    expect(completed.length).toStrictEqual(0)

    const pending = await app.get(CollateralTokenMapper).getDeferredMapper().query(false, activationHeight)
    expect(pending.length).toStrictEqual(1)
    expect(pending[0].id).toStrictEqual('1-00000075-109') // 0x75 = 107
    expect(pending[0].activated).toStrictEqual(false)
  }

  await container.waitForBlockHeight(118)
  await waitForIndexedHeight(app, 117)

  { // after activated
    // unchanged
    const ethCol = await app.get(CollateralTokenMapper).getMapper().get('2') as CollateralToken
    expect(ethCol).toBeDefined()
    expect(ethCol.id).toStrictEqual('2')
    expect(ethCol.factor).toStrictEqual('1')
    expect(ethCol.activationHeight).toStrictEqual(0)
    expect(ethCol.token?.id).toStrictEqual(2)
    expect(ethCol.token?.symbol).toStrictEqual('ETH')
    expect(ethCol.tokenCurrency).toStrictEqual('ETH-USD')
    expect(ethCol.block?.height).toStrictEqual(108)
    expect(ethCol).toStrictEqual(full.find(ct => ct.id === '2'))

    // updated
    const btcCol = await app.get(CollateralTokenMapper).getMapper().get('1') as CollateralToken
    expect(btcCol).toBeDefined()
    expect(btcCol.id).toStrictEqual('1')
    expect(btcCol.factor).toStrictEqual('0.6')
    expect(btcCol.activationHeight).toStrictEqual(117)
    expect(btcCol.token?.id).toStrictEqual(1)
    expect(btcCol.token?.symbol).toStrictEqual('BTC')
    expect(btcCol.tokenCurrency).toStrictEqual('BTC-EUR')
    expect(btcCol.block?.height).toStrictEqual(109)
  }

  {
    const allHistory = await app.get(CollateralTokenMapper).getHistoryMapper().queryAll(100)
    expect(allHistory.length).toStrictEqual(3)
    const [newest, second, oldest] = allHistory

    const btcColHistory = await app.get(CollateralTokenMapper).getHistoryMapper().query('1', 100)
    expect(btcColHistory.length).toStrictEqual(2)

    expect(btcColHistory[0]).toStrictEqual(newest)
    // FIXME(@ivan-zynesis): debugging why serial number not increment correctly in "partition"
    // expect(btcColHistory[0].id).toStrictEqual('0000006d-00000000-1')
    expect(btcColHistory[0].tokenCurrency).toStrictEqual('BTC-EUR')
    expect(btcColHistory[0].token.id).toStrictEqual(1)
    expect(btcColHistory[0].token.symbol).toStrictEqual('BTC')
    expect(btcColHistory[0].factor).toStrictEqual('0.6')
    expect(btcColHistory[0].block.height).toStrictEqual(109)

    expect(btcColHistory[1]).toStrictEqual(oldest)
    // FIXME(@ivan-zynesis): debugging why serial number not increment correctly in "partition"
    // expect(btcColHistory[1].id).toStrictEqual('0000006c-00000000-1') // first setCollateral at height 0x6c
    expect(btcColHistory[1].tokenCurrency).toStrictEqual('BTC-EUR')
    expect(btcColHistory[1].token.id).toStrictEqual(1)
    expect(btcColHistory[1].token.symbol).toStrictEqual('BTC')
    expect(btcColHistory[1].factor).toStrictEqual('1')
    expect(btcColHistory[1].block.height).toStrictEqual(108)

    console.log('btc', btcColHistory)

    const ethColHistory = await app.get(CollateralTokenMapper).getHistoryMapper().query('2', 100)
    expect(ethColHistory.length).toStrictEqual(1)
    expect(ethColHistory[0]).toStrictEqual(second)
    // FIXME(@ivan-zynesis): debugging why serial number not increment correctly in "partition"
    // expect(ethColHistory[0].id).toStrictEqual('0000006c-00000001-2') // second setCollateral at height 0x6c
    expect(ethColHistory[0].tokenCurrency).toStrictEqual('ETH-USD')
    expect(ethColHistory[0].token.id).toStrictEqual(2)
    expect(ethColHistory[0].token.symbol).toStrictEqual('ETH')
    expect(ethColHistory[0].factor).toStrictEqual('1')
    expect(ethColHistory[0].block.height).toStrictEqual(108)

    console.log('eth', ethColHistory)
  }
})
