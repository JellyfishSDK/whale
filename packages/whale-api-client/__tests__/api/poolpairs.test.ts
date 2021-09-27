import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { ApiPagedResponse, WhaleApiClient, WhaleApiException } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { PoolPairData } from '../../src/api/poolpairs'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  await setup()
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

async function setup (): Promise<void> {
  const tokens = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

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
  await createPoolPair(container, 'G', 'DFI')
  await createPoolPair(container, 'H', 'DFI')

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

  // dexUsdtDfi setup
  await createToken(container, 'USDT')
  await createPoolPair(container, 'USDT', 'DFI')
  await mintTokens(container, 'USDT')
  await addPoolLiquidity(container, {
    tokenA: 'USDT',
    amountA: 1000,
    tokenB: 'DFI',
    amountB: 431.51288,
    shareAddress: await getNewAddress(container)
  })

  const height = await container.getBlockCount()
  await container.generate(1)
  await service.waitForIndexedHeight(height)
  await container.generate(1)
}

describe('list', () => {
  it('should list', async () => {
    const response: ApiPagedResponse<PoolPairData> = await client.poolpairs.list(30)

    expect(response.length).toStrictEqual(9)
    expect(response.hasNext).toStrictEqual(false)

    expect(response[1]).toStrictEqual({
      id: '10',
      sort: '0000000a',
      symbol: 'B-DFI',
      name: 'B-Default Defi token',
      status: true,
      tokenA: {
        id: '2',
        symbol: 'B',
        reserve: '50.00000000',
        displaySymbol: 'dB'
      },
      tokenB: {
        id: '0',
        symbol: 'DFI',
        reserve: '300.00000000',
        displaySymbol: 'DFI'
      },
      apr: {
        reward: 0,
        total: 0
      },
      commission: '0.00000000',
      totalLiquidity: {
        token: '122.47448714',
        usd: '1390.45675763'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.16666667',
        ba: '6.00000000'
      },
      rewardPct: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      customRewards: expect.any(Array)
    })
  })

  it('should list with pagination', async () => {
    const first = await client.poolpairs.list(4)
    expect(first.length).toStrictEqual(4)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('0000000c')

    expect(first[0].symbol).toStrictEqual('A-DFI')
    expect(first[1].symbol).toStrictEqual('B-DFI')
    expect(first[2].symbol).toStrictEqual('C-DFI')
    expect(first[3].symbol).toStrictEqual('D-DFI')

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(4)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('00000010')

    expect(next[0].symbol).toStrictEqual('E-DFI')
    expect(next[1].symbol).toStrictEqual('F-DFI')
    expect(next[2].symbol).toStrictEqual('G-DFI')
    expect(next[3].symbol).toStrictEqual('H-DFI')

    const last = await client.paginate(next)
    expect(last.length).toStrictEqual(1)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()

    expect(last[0].symbol).toStrictEqual('USDT-DFI')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response: PoolPairData = await client.poolpairs.get('9')

    expect(response).toStrictEqual({
      id: '9',
      sort: '00000009',
      symbol: 'A-DFI',
      name: 'A-Default Defi token',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'A',
        reserve: '100.00000000',
        displaySymbol: 'dA'
      },
      tokenB: {
        id: '0',
        symbol: 'DFI',
        reserve: '200.00000000',
        displaySymbol: 'DFI'
      },
      apr: {
        reward: 0,
        total: 0
      },
      commission: '0.00000000',
      totalLiquidity: {
        token: '141.42135624',
        usd: '926.97117175'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.50000000',
        ba: '2.00000000'
      },
      rewardPct: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      customRewards: expect.any(Array)
    })
  })

  it('should throw error as numeric string is expected', async () => {
    expect.assertions(2)
    try {
      await client.poolpairs.get('A-DFI')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Validation failed (numeric string is expected)',
        url: '/v0.0/regtest/poolpairs/A-DFI'
      })
    }
  })

  it('should throw error while getting non-existent poolpair', async () => {
    expect.assertions(2)
    try {
      await client.poolpairs.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find poolpair',
        url: '/v0.0/regtest/poolpairs/999'
      })
    }
  })
})
