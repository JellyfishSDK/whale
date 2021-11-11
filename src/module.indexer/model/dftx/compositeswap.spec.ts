import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '@src/e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
let app: NestFastifyApplication
let client: JsonRpcClient

beforeEach(async () => {
  await container.start()
  app = await createTestingApp(container)
  client = new JsonRpcClient(await container.getCachedRpcUrl())
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(101) // token creation fee

  const tokens = ['B', 'C', 'D']

  await testing.token.dfi({ amount: 10000 })

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await testing.token.create({ symbol: token })
    await container.generate(1)
    await testing.token.mint({ amount: 10000, symbol: token })
    await testing.poolpair.create({ tokenA: token, tokenB: 'DFI' })
    await container.generate(1)
    await testing.poolpair.add({ a: { symbol: token, amount: 100 }, b: { symbol: 'DFI', amount: 200 } })
    await testing.token.send({ address: await testing.address('my'), symbol: token, amount: 1000 })
  }

  await container.generate(1)
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('composite swap', () => {
  it('should index composite swap', async () => {
    await waitForIndexedHeightLatest(app, container)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(3)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairs[0]).toStrictEqual({
      id: '2-104',
      sort: '00000002',
      pairSymbol: 'B-DFI',
      name: 'B-Default Defi token',
      poolPairId: '2',
      tokenA: {
        id: 1,
        symbol: 'B',
        reserve: '100.00000000'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '200.00000000'
      },
      block: {
        hash: expect.any(String),
        height: 104,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000',
      totalLiquidity: '141.42135623',
      creationHeight: 103,
      creationTx: expect.any(String),
      customRewards: [],
      ownerScript: expect.any(String)
    })

    await client.poolpair.compositeSwap({
      from: await testing.address('my'),
      tokenFrom: 'B',
      tokenTo: 'C',
      amountFrom: 10,
      to: await testing.address('my')
    })

    await waitForIndexedHeightLatest(app, container)

    const poolPairsAfterSwap = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairsAfterSwap[0]).toStrictEqual({
      id: '2-111',
      sort: '00000002',
      pairSymbol: 'B-DFI',
      name: 'B-Default Defi token',
      poolPairId: '2',
      tokenA: {
        id: 1,
        symbol: 'B',
        reserve: '110.00000000'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '181.81818181'
      },
      block: {
        hash: expect.any(String),
        height: 111,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000',
      totalLiquidity: '141.42135623',
      creationHeight: 103,
      creationTx: expect.any(String),
      customRewards: [],
      ownerScript: expect.any(String)
    })

    expect(poolPairsAfterSwap[1]).toStrictEqual({
      id: '4-111',
      sort: '00000004',
      pairSymbol: 'C-DFI',
      name: 'C-Default Defi token',
      poolPairId: '4',
      tokenA: {
        id: 3,
        symbol: 'C',
        reserve: '91.66666666'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI',
        reserve: '218.18181819'
      },
      block: {
        hash: expect.any(String),
        height: 111,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000',
      totalLiquidity: '141.42135623',
      creationHeight: 105,
      creationTx: expect.any(String),
      customRewards: [],
      ownerScript: expect.any(String)
    })
  })
})
