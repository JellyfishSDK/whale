import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { DeFiDCache } from './cache/defid.cache'
import { CacheModule, NotFoundException } from '@nestjs/common'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let service: PoolPairService

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      DeFiDCache,
      PoolPairService
    ]
  }).compile()

  service = app.get(PoolPairService)

  const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }
  await createPoolPair(container, 'A', 'B')
  await createPoolPair(container, 'A', 'C')
  await createPoolPair(container, 'A', 'D')
  await createPoolPair(container, 'A', 'E')
  await createPoolPair(container, 'A', 'F')
  await createPoolPair(container, 'B', 'C')
  await createPoolPair(container, 'B', 'D')
  await createPoolPair(container, 'B', 'E')
  await container.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 100,
    tokenB: 'B',
    amountB: 200,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 50,
    tokenB: 'C',
    amountB: 300,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 90,
    tokenB: 'D',
    amountB: 360,
    shareAddress: await getNewAddress(container)
  })
})

afterAll(async () => {
  await container.stop()
})

describe('list', () => {
  it('should list', async () => {
    const pairPairsData = await service.list({
      size: 30
    })

    expect(pairPairsData.length).toStrictEqual(8)

    expect(pairPairsData[1]).toStrictEqual({
      id: '8',
      symbol: 'A-C',
      name: 'A-C',
      status: true,
      idTokenA: '1',
      idTokenB: '3',
      reserveA: new BigNumber('50'),
      reserveB: new BigNumber('300'),
      blockCommissionA: new BigNumber('0'),
      blockCommissionB: new BigNumber('0'),
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('122.47448713'),
      totalLiquidityUsd: new BigNumber('123.943738074614627569'),
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      'reserveA/reserveB': new BigNumber('0.16666666'),
      'reserveB/reserveA': new BigNumber('6'),
      rewardPct: new BigNumber('0'),
      creationTx: expect.any(String),
      creationHeight: expect.any(BigNumber)
    })
  })

  it('should list with pagination', async () => {
    const pairPairsData = await service.list({
      size: 2
    })
    expect(pairPairsData.length).toStrictEqual(2)
    expect(pairPairsData[0].symbol).toStrictEqual('A-B')
    expect(pairPairsData[1].symbol).toStrictEqual('A-C')
  })
})

describe('get', () => {
  it('should get', async () => {
    const pairPairData = await service.get('7')

    expect(pairPairData).toStrictEqual({
      id: '7',
      symbol: 'A-B',
      name: 'A-B',
      status: true,
      idTokenA: expect.any(String),
      idTokenB: expect.any(String),
      reserveA: new BigNumber('100'),
      reserveB: new BigNumber('200'),
      blockCommissionA: new BigNumber('0'),
      blockCommissionB: new BigNumber('0'),
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('141.42135623'),
      totalLiquidityUsd: new BigNumber('235.762326049743085046'),
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      'reserveA/reserveB': new BigNumber('0.5'),
      'reserveB/reserveA': new BigNumber('2'),
      rewardPct: new BigNumber('0'),
      creationTx: expect.any(String),
      creationHeight: expect.any(BigNumber)
    })
  })

  it('should throw error while getting non-existent poolpair', async () => {
    expect.assertions(2)
    try {
      await service.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find poolpair',
        error: 'Not Found'
      })
    }
  })
})
