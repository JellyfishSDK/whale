import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { CacheModule, NotFoundException } from '@nestjs/common'
import { DeFiDCache } from './cache/defid.cache'
import { ConfigService } from '@nestjs/config'
import BigNumber from 'bignumber.js'

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
      PoolPairService,
      ConfigService
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
  spy = jest.spyOn(service, 'dexUsdtDfi').mockImplementation(async () => await Promise.resolve(new BigNumber('0.43151288')))
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
  await createPoolPair(container, 'A', 'DFI')
  await createPoolPair(container, 'B', 'DFI')
  await createPoolPair(container, 'C', 'DFI')
  await createPoolPair(container, 'D', 'DFI')
  await createPoolPair(container, 'E', 'DFI')
  await createPoolPair(container, 'F', 'DFI')

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
  await addPoolLiquidity(container, {
    tokenA: 'C',
    amountA: 90,
    tokenB: 'DFI',
    amountB: 360,
    shareAddress: await getNewAddress(container)
  })
}

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toStrictEqual(6)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      id: '8',
      symbol: 'B-DFI',
      name: 'B-Default Defi token',
      status: true,
      tokenA: {
        id: '2',
        reserve: '50',
        blockCommission: '0'
      },
      tokenB: {
        id: '0',
        reserve: '300',
        blockCommission: '0'
      },
      commission: '0',
      totalLiquidity: {
        token: '122.47448713',
        usd: '698.8243194812225612665'
      },
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
    expect(first.data[0].symbol).toStrictEqual('A-DFI')
    expect(first.data[1].symbol).toStrictEqual('B-DFI')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('C-DFI')
    expect(next.data[1].symbol).toStrictEqual('D-DFI')
    expect(next.data[2].symbol).toStrictEqual('E-DFI')
    expect(next.data[3].symbol).toStrictEqual('F-DFI')
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
      symbol: 'A-DFI',
      name: 'A-Default Defi token',
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
      totalLiquidity: {
        token: '141.42135623',
        usd: '485.0612298763705964'
      },
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
