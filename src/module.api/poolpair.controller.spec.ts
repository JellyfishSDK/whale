import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { CacheModule } from '@nestjs/common'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let controller: PoolPairController
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    controllers: [PoolPairController],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      PoolPairInfoCache
    ]
  }).compile()

  controller = app.get(PoolPairController)
})

afterAll(async () => {
  await container.stop()
})

describe('list', () => {
  beforeAll(async () => {
    const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
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
  })

  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toBe(8)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toEqual({
      id: '8',
      symbol: 'A-C',
      name: 'A-C',
      status: true,
      idTokenA: '1',
      idTokenB: '3',
      reserveA: new BigNumber('0'),
      reserveB: new BigNumber('0'),
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('0'),
      'reserveA/reserveB': '0',
      'reserveB/reserveA': '0',
      tradeEnabled: false,
      ownerAddress: expect.any(String),
      blockCommissionA: new BigNumber('0'),
      blockCommissionB: new BigNumber('0'),
      rewardPct: new BigNumber('0'),
      customRewards: undefined,
      creationTx: expect.any(String),
      creationHeight: expect.any(BigNumber)
    })
  })

  it('should list with pagination', async () => {
    const first = await controller.list({
      size: 2
    })
    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('8')
    expect(first.data[0].symbol).toBe('A-B')
    expect(first.data[1].symbol).toBe('A-C')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toBe(6)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toBe('A-D')
    expect(next.data[1].symbol).toBe('A-E')
    expect(next.data[2].symbol).toBe('A-F')
    expect(next.data[3].symbol).toBe('B-C')
    expect(next.data[4].symbol).toBe('B-D')
    expect(next.data[5].symbol).toBe('B-E')
  })

  it('should list with undefined next pagination', async () => {
    const first = await controller.list({
      size: 2,
      next: undefined
    })

    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('8')
  })
})

describe('listPoolShares', () => {
  beforeAll(async () => {
    const tokens = ['U', 'V', 'W']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'U', 'V')
    await createPoolPair(container, 'U', 'W')
    await createPoolPair(container, 'V', 'W')

    await addPoolLiquidity(container, {
      tokenA: 'U',
      amountA: 100,
      tokenB: 'V',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await addPoolLiquidity(container, {
      tokenA: 'U',
      amountA: 50,
      tokenB: 'W',
      amountB: 300,
      shareAddress: await getNewAddress(container)
    })
    await addPoolLiquidity(container, {
      tokenA: 'V',
      amountA: 90,
      tokenB: 'W',
      amountB: 360,
      shareAddress: await getNewAddress(container)
    })
  })

  it('should listPoolShares', async () => {
    const response = await controller.listPoolShares({
      size: 30
    })

    expect(response.data.length).toBe(3)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toEqual({
      id: expect.any(String),
      poolID: '19',
      owner: expect.any(String),
      percent: expect.any(BigNumber),
      amount: expect.any(BigNumber),
      totalLiquidity: expect.any(BigNumber)
    })
  })

  it('should listPoolShares with pagination', async () => {
    const first = await controller.listPoolShares({
      size: 2
    })
    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('19')
    expect(first.data[0].poolID).toBe('18')
    expect(first.data[1].poolID).toBe('19')

    const next = await controller.listPoolShares({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toBe(1)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].poolID).toBe('20')
  })

  it('should listPoolShares with undefined next pagination', async () => {
    const first = await controller.listPoolShares({
      size: 1,
      next: undefined
    })

    expect(first.data.length).toBe(1)
    expect(first.page?.next).toBe('18')
  })
})
