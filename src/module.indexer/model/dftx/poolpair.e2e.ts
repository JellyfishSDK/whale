import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createPoolPair, createToken, mintTokens } from '@defichain/testing'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('index poolpair', () => {
  it('should index poolpair', async () => {
    const tokens = ['A', 'B']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')
    // await createPoolPair(container, 'B', 'DFI')

    // await addPoolLiquidity(container, {
    //   tokenA: 'A',
    //   amountA: 100,
    //   tokenB: 'DFI',
    //   amountB: 200,
    //   shareAddress: await getNewAddress(container)
    // })
    // await addPoolLiquidity(container, {
    //   tokenA: 'B',
    //   amountA: 50,
    //   tokenB: 'DFI',
    //   amountB: 300,
    //   shareAddress: await getNewAddress(container)
    // })

    // // dexUsdtDfi setup
    // await createToken(container, 'USDT')
    // await createPoolPair(container, 'USDT', 'DFI')
    // await mintTokens(container, 'USDT')
    // await addPoolLiquidity(container, {
    //   tokenA: 'USDT',
    //   amountA: 1000,
    //   tokenB: 'DFI',
    //   amountB: 431.51288,
    //   shareAddress: await getNewAddress(container)
    // })

    await container.generate(1)
    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    // const poolPairMapper = await app.get(PoolPairMapper)
    const poolPairTokenMapper = await app.get(PoolPairTokenMapper)

    const poolPairTokenList = await poolPairTokenMapper.list(1000)
    expect(poolPairTokenList.length).toStrictEqual(1)
  })
})
