import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '@src/e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens, poolSwap, sendTokensToAddress } from '@defichain/testing'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolSwapMapper } from '@src/module.model/poolswap'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { PoolSwapAggregatedMapper } from '@src/module.model/poolswap.aggregated'
import { PoolSwapIntervalSeconds } from './poolswap.interval'
import { Testing } from '@defichain/jellyfish-testing'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let testing: Testing

beforeEach(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)

  testing = Testing.create(container)
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
    const poolSwapMapper = app.get(PoolSwapMapper)
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

    const resultSwaps = await poolSwapMapper.query('3', Number.MAX_SAFE_INTEGER)
    expect(resultSwaps).toStrictEqual([{
      fromAmount: '100.00000000',
      fromTokenId: 1,
      id: expect.any(String),
      key: '3',
      poolPairId: '3',
      sort: expect.any(String),
      block: expect.any(Object)
    }])

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

    const resultSwaps2 = await poolSwapMapper.query('3', Number.MAX_SAFE_INTEGER, undefined, HexEncoder.encodeHeight(118))
    expect(resultSwaps2).toStrictEqual([
      {
        block: expect.any(Object),
        fromAmount: '6.00000000',
        fromTokenId: 0,
        id: expect.any(String),
        key: '3',
        poolPairId: '3',
        sort: expect.any(String)
      },
      {
        block: expect.any(Object),
        fromAmount: '5.00000000',
        fromTokenId: 1,
        id: expect.any(String),
        key: '3',
        poolPairId: '3',
        sort: expect.any(String)
      }
    ])

    const aggregatedMapper = app.get(PoolSwapAggregatedMapper)
    const aggregated = await aggregatedMapper.query(`3-${PoolSwapIntervalSeconds.ONE_HOUR}`, 1)
    expect(aggregated[0]).toStrictEqual(
      {
        aggregated: {
          amounts: {
            0: '6.00000000',
            1: '105.00000000'
          }
        },
        block: expect.any(Object),
        id: '3-3600-109',
        key: '3-3600',
        sort: expect.any(String)
      }
    )
  })
})

describe('poolswap 30d', () => {
  it('should index volume and swaps for 30d', async () => {
    await testing.generate(1)

    const tokens = ['A']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token, {
        collateralAddress: await testing.address('swap')
      })
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })

    {
      const fiveMinutes = 60 * 5
      const numBlocks = 24 * 2 * 12
      const timeNow = Math.floor(Date.now() / 1000)
      for (let i = 0; i <= numBlocks; i++) {
        const mockTime = timeNow + i * fiveMinutes
        await testing.rpc.misc.setMockTime(mockTime)

        await testing.rpc.poolpair.poolSwap({
          from: await testing.address('swap'),
          tokenFrom: 'A',
          amountFrom: 0.1,
          to: await testing.address('swap'),
          tokenTo: 'DFI'
        })

        await testing.generate(1)
      }

      await waitForIndexedHeightLatest(app, container)
    }

    const aggregatedMapper = app.get(PoolSwapAggregatedMapper)
    const aggregated = await aggregatedMapper.query(`2-${PoolSwapIntervalSeconds.ONE_DAY}`, 2)
    expect(aggregated).toStrictEqual([
      {
        id: '2-86400-398',
        key: '2-86400',
        sort: expect.any(String),
        aggregated: {
          amounts: {
            1: '28.70000000'
          }
        },
        block: expect.any(Object)
      },
      {
        id: '2-86400-107',
        key: '2-86400',
        sort: expect.any(String),
        aggregated: {
          amounts: {
            1: '29.00000000'
          }
        },
        block: expect.any(Object)
      }
    ])
  })
})
