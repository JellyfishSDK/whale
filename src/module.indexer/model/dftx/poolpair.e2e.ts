import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '@src/e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens, poolSwap, sendTokensToAddress } from '@defichain/testing'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { PoolPairMapper } from '@src/module.model/poolpair'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeEach(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('index poolpair', () => {
  it('should index poolpair', async () => {
    const tokens = ['AB', 'AC']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'AB', 'DFI')
    await createPoolPair(container, 'AC', 'DFI')

    await waitForIndexedHeightLatest(app, container)

    const poolPairTokenMapper = await app.get(PoolPairTokenMapper)
    const poolPairTokenList = await poolPairTokenMapper.list(1000)
    expect(poolPairTokenList.length).toStrictEqual(2)
  })
})

describe('index poolswap', () => {
  it('should index poolswap', async () => {
    const ownerAddress = await getNewAddress(container)
    const tokens = ['A', 'B']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')
    await createPoolPair(container, 'B', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 300,
      shareAddress: await getNewAddress(container)
    })

    await sendTokensToAddress(container, ownerAddress, 500, 'A')

    await waitForIndexedHeightLatest(app, container)

    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairMapper.getLatest('3')

    expect(result).toStrictEqual({
      commission: '0.00000000',
      id: '3-108',
      name: 'A-Default Defi token',
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object),
      sort: '00000003'
    })

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: 100,
      to: ownerAddress,
      tokenTo: 'DFI'
    })

    await waitForIndexedHeightLatest(app, container)

    const resultPostSwap = await poolPairMapper.getLatest('3')
    expect(resultPostSwap).toStrictEqual({
      commission: '0.00000000',
      id: '3-108',
      name: 'A-Default Defi token',
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object),
      sort: '00000003'
    })

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: 5,
      to: ownerAddress,
      tokenTo: 'DFI'
    })

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'DFI',
      amountFrom: 6,
      to: ownerAddress,
      tokenTo: 'A'
    })

    await waitForIndexedHeightLatest(app, container)
  })
})
