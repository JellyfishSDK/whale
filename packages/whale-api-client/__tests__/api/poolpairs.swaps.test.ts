import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { StubWhaleApiClient } from '../stub.client'
import { Testing } from '@defichain/jellyfish-testing'
import { ApiPagedResponse, WhaleApiClient } from '../../src'
import { PoolSwapData } from '../../src/api/poolpairs'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient
let testing: Testing

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)
  testing = Testing.create(container)

  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await service.start()

  const tokens = ['A', 'B', 'C']

  await testing.token.dfi({ amount: 10000 })

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await testing.token.create({ symbol: token })
    await container.generate(1)
    await testing.token.mint({ amount: 10000, symbol: token })
    await container.generate(1)
    await testing.token.send({ address: await testing.address('swap'), symbol: token, amount: 1000 })
  }

  await testing.poolpair.create({ tokenA: 'A', tokenB: 'B' })
  await container.generate(1)
  await testing.poolpair.add({ a: { symbol: 'A', amount: 100 }, b: { symbol: 'B', amount: 200 } })

  await testing.poolpair.create({ tokenA: 'B', tokenB: 'C' })
  await container.generate(1)
  await testing.poolpair.add({ a: { symbol: 'B', amount: 100 }, b: { symbol: 'C', amount: 200 } })

  await testing.poolpair.create({ tokenA: 'DFI', tokenB: 'C' })
  await container.generate(1)
  await testing.poolpair.add({ a: { symbol: 'DFI', amount: 100 }, b: { symbol: 'C', amount: 200 } })
  await testing.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await testing.container.stop()
  }
})

describe('poolswap buy-sell indicator', () => {
  it('should get swap poolpair buy or sell details', async () => {
    await testing.rpc.poolpair.compositeSwap({
      from: await testing.address('swap'),
      tokenFrom: 'A',
      amountFrom: 20,
      to: await testing.address('swap'),
      tokenTo: 'DFI'
    })

    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)

    const verbose4: ApiPagedResponse<PoolSwapData> = await client.poolpairs.listPoolSwapsVerbose('4')
    expect(verbose4.hasNext).toStrictEqual(false)
    expect([...verbose4]).toStrictEqual([
      {
        id: expect.any(String),
        txid: expect.stringMatching(/[0-f]{64}/),
        txno: expect.any(Number),
        poolPairId: '4',
        sort: expect.any(String),
        fromAmount: '20.00000000',
        fromTokenId: 1,
        block: {
          hash: expect.stringMatching(/[0-f]{64}/),
          height: expect.any(Number),
          time: expect.any(Number),
          medianTime: expect.any(Number)
        },
        from: {
          address: expect.any(String),
          symbol: 'A',
          amount: '20.00000000',
          displaySymbol: 'dA'
        },
        to: {
          address: expect.any(String),
          amount: '19.99999999',
          symbol: 'DFI',
          displaySymbol: 'DFI'
        },
        isSell: true
      }
    ])

    const verbose5: ApiPagedResponse<PoolSwapData> = await client.poolpairs.listPoolSwapsVerbose('5')
    expect(verbose5.hasNext).toStrictEqual(false)
    expect([...verbose5]).toStrictEqual([
      {
        id: expect.any(String),
        txid: expect.stringMatching(/[0-f]{64}/),
        txno: expect.any(Number),
        poolPairId: '5',
        sort: expect.any(String),
        fromAmount: '20.00000000',
        fromTokenId: 1,
        block: {
          hash: expect.stringMatching(/[0-f]{64}/),
          height: expect.any(Number),
          time: expect.any(Number),
          medianTime: expect.any(Number)
        },
        from: {
          address: expect.any(String),
          symbol: 'A',
          amount: '20.00000000',
          displaySymbol: 'dA'
        },
        to: {
          address: expect.any(String),
          amount: '19.99999999',
          symbol: 'DFI',
          displaySymbol: 'DFI'
        },
        isSell: true
      }
    ])

    const verbose6: ApiPagedResponse<PoolSwapData> = await client.poolpairs.listPoolSwapsVerbose('6')
    expect(verbose6.hasNext).toStrictEqual(false)
    expect([...verbose6]).toStrictEqual([
      {
        id: expect.any(String),
        txid: expect.stringMatching(/[0-f]{64}/),
        txno: expect.any(Number),
        poolPairId: '6',
        sort: expect.any(String),
        fromAmount: '20.00000000',
        fromTokenId: 1,
        block: {
          hash: expect.stringMatching(/[0-f]{64}/),
          height: expect.any(Number),
          time: expect.any(Number),
          medianTime: expect.any(Number)
        },
        from: {
          address: expect.any(String),
          symbol: 'A',
          amount: '20.00000000',
          displaySymbol: 'dA'
        },
        to: {
          address: expect.any(String),
          amount: '19.99999999',
          symbol: 'DFI',
          displaySymbol: 'DFI'
        },
        isSell: false
      }
    ])
  })
})
