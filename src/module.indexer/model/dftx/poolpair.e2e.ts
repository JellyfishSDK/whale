import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '@src/e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens, poolSwap, removePoolLiquidity, sendTokensToAddress } from '@defichain/testing'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { PoolPairMapper } from '@src/module.model/poolpair'
import BigNumber from 'bignumber.js'

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

describe('index poolswap and add liquidity', () => {
  it('should index poolswap and add liquidity', async () => {
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
      creationHeight: 108,
      creationTx: expect.any(String),
      customRewards: expect.any(Array),
      id: '3-110',
      name: 'A-Default Defi token',
      ownerScript: expect.any(String),
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A',
        reserve: '100.00000000'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '200.00000000'
      },
      totalLiquidity: '141.42135623',
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
      creationHeight: 108,
      creationTx: expect.any(String),
      customRewards: expect.any(Array),
      id: '3-115',
      name: 'A-Default Defi token',
      ownerScript: expect.any(String),
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A',
        reserve: '200.00000000'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '100.00000000'
      },
      totalLiquidity: '141.42135623',
      block: expect.any(Object),
      sort: '00000003'
    })
  })
})

describe('add liquidity and remove liquidity', () => {
  it('should index add liquidity and remove liquidity', async () => {
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
      shareAddress: ownerAddress
    })
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 300,
      shareAddress: ownerAddress
    })

    await sendTokensToAddress(container, ownerAddress, 500, 'A')

    await waitForIndexedHeightLatest(app, container)

    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairMapper.getLatest('3')

    expect(result).toStrictEqual({
      commission: '0.00000000',
      creationHeight: 108,
      creationTx: expect.any(String),
      customRewards: expect.any(Array),
      id: '3-110',
      name: 'A-Default Defi token',
      ownerScript: expect.any(String),
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A',
        reserve: '100.00000000'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '200.00000000'
      },
      totalLiquidity: '141.42135623',
      block: expect.any(Object),
      sort: '00000003'
    })

    const removeMsg = await removePoolLiquidity(container, {
      address: ownerAddress,
      tokenLP: result?.poolPairId ?? '',
      amountLP: new BigNumber(20)
    })

    console.log(removeMsg)

    await waitForIndexedHeightLatest(app, container)

    const resultPostRemove = await poolPairMapper.getLatest('3')
    expect(resultPostRemove).toStrictEqual({
      commission: '0.00000000',
      creationHeight: 108,
      creationTx: expect.any(String),
      customRewards: expect.any(Array),
      id: '3-115',
      name: 'A-Default Defi token',
      ownerScript: expect.any(String),
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A',
        reserve: '85.85786437'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '171.71572875'
      },
      totalLiquidity: '121.42135623',
      block: expect.any(Object),
      sort: '00000003'
    })
  })
})
