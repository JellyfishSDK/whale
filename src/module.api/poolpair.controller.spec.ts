import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { CacheModule, NotFoundException } from '@nestjs/common'
import { DeFiDCache } from './cache/defid.cache'

const container = new MasterNodeRegTestContainer()
let controller: PoolPairController
let service: PoolPairService
let spy: jest.SpyInstance

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    controllers: [PoolPairController],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      DeFiDCache,
      PoolPairService
    ]
  }).compile()

  controller = app.get(PoolPairController)

  service = app.get(PoolPairService) // for stubbing testPoolSwap

  await setup()
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  spy = jest.spyOn(service, 'testPoolSwap').mockImplementation(
    async (x, y) => x === 'USDT' && y === 'DFI'
      ? await Promise.resolve('0.43151288@0') // usdt to dfi
      : await Promise.resolve('14.23530023@777')) // token to dfi
})

afterEach(() => {
  spy.mockRestore()
})

async function setup (): Promise<void> {
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
}

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toStrictEqual(8)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      id: '8',
      symbol: 'A-C',
      name: 'A-C',
      status: true,
      tokenA: {
        id: '1',
        reserve: '50',
        blockCommission: '0'
      },
      tokenB: {
        id: '3',
        reserve: '300',
        blockCommission: '0'
      },
      commission: '0',
      totalLiquidity: '122.47448713',
      totalLiquidityUsd: '124.965259043707276669',
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        'tokenA/tokenB': '0.16666666',
        'tokenB/tokenA': '6'
      },
      rewardPct: '0',
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await controller.list({
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('8')
    expect(first.data[0].symbol).toStrictEqual('A-B')
    expect(first.data[1].symbol).toStrictEqual('A-C')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(6)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('A-D')
    expect(next.data[1].symbol).toStrictEqual('A-E')
    expect(next.data[2].symbol).toStrictEqual('A-F')
    expect(next.data[3].symbol).toStrictEqual('B-C')
    expect(next.data[4].symbol).toStrictEqual('B-D')
    expect(next.data[5].symbol).toStrictEqual('B-E')
  })

  it('should list with undefined next pagination', async () => {
    const first = await controller.list({
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('8')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await controller.get('7')

    expect(response).toStrictEqual({
      id: '7',
      symbol: 'A-B',
      name: 'A-B',
      status: true,
      tokenA: {
        id: expect.any(String),
        reserve: '100',
        blockCommission: '0'
      },
      tokenB: {
        id: expect.any(String),
        reserve: '200',
        blockCommission: '0'
      },
      commission: '0',
      totalLiquidity: '141.42135623',
      totalLiquidityUsd: '237.805367987928383246',
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        'tokenA/tokenB': '0.5',
        'tokenB/tokenA': '2'
      },
      rewardPct: '0',
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should throw error while getting non-existent poolpair', async () => {
    expect.assertions(2)
    try {
      await controller.get('999')
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
