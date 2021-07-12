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
    providers: [
      { provide: JsonRpcClient, useValue: client },
      DeFiDCache,
      PoolPairService
    ]
  }).compile()

  service = app.get(PoolPairService)

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
    const pairPairsData = await service.list({
      size: 30
    })

    expect(pairPairsData.length).toStrictEqual(6)

    expect(pairPairsData[1]).toStrictEqual({
      id: '8',
      symbol: 'B-DFI',
      name: 'B-Default Defi token',
      status: true,
      idTokenA: '2',
      idTokenB: '0',
      reserveA: new BigNumber('50'),
      reserveB: new BigNumber('300'),
      blockCommissionA: new BigNumber('0'),
      blockCommissionB: new BigNumber('0'),
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('122.47448713'),
      totalLiquidityUsd: new BigNumber('698.8243194812225612665'),
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
    expect(pairPairsData[0].symbol).toStrictEqual('A-DFI')
    expect(pairPairsData[1].symbol).toStrictEqual('B-DFI')
  })
})

describe('get', () => {
  it('should get', async () => {
    const pairPairData = await service.get('7')

    expect(pairPairData).toStrictEqual({
      id: '7',
      symbol: 'A-DFI',
      name: 'A-Default Defi token',
      status: true,
      idTokenA: expect.any(String),
      idTokenB: expect.any(String),
      reserveA: new BigNumber('100'),
      reserveB: new BigNumber('200'),
      blockCommissionA: new BigNumber('0'),
      blockCommissionB: new BigNumber('0'),
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('141.42135623'),
      totalLiquidityUsd: new BigNumber('485.0612298763705964'),
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
