import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createPoolPair, createToken, mintTokens } from '@defichain/testing'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  app = await createTestingApp(container)
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(101) // token creation fee

  const tokens = ['USDT', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }

  for (const token of tokens) {
    await createPoolPair(container, token, 'DFI')
  }

  await container.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('create poolpair', () => {
  it('should index poolpairs', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(6)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairs[0]).toStrictEqual({
      commission: '0.00000000',
      creationHeight: 120,
      creationTx: expect.any(String),
      customRewards: expect.any(Array),
      id: '7-120',
      name: 'USDT-Default Defi token',
      ownerScript: expect.any(String),
      pairSymbol: 'USDT-DFI',
      poolPairId: '7',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'USDT',
        reserve: '0'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '0'
      },
      totalLiquidity: '0',
      block: expect.any(Object),
      sort: '00000007'
    })

    expect(poolPairs[1]).toStrictEqual({
      commission: '0.00000000',
      creationHeight: 121,
      creationTx: expect.any(String),
      customRewards: expect.any(Array),
      id: '8-121',
      name: 'B-Default Defi token',
      ownerScript: expect.any(String),
      pairSymbol: 'B-DFI',
      poolPairId: '8',
      status: true,
      tokenA: {
        id: 2,
        symbol: 'B',
        reserve: '0'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '0'
      },
      totalLiquidity: '0',
      block: expect.any(Object),
      sort: '00000008'
    })
  })
})
