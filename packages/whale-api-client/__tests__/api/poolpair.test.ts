import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import BigNumber from 'bignumber.js'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

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
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should list', async () => {
    const response = await client.poolpair.list(30)

    expect(response.length).toBe(8)
    expect(response.hasNext).toBe(false)

    expect(response[1]).toEqual({
      id: '8',
      symbol: 'A-C',
      name: 'A-C',
      status: true,
      idTokenA: '1',
      idTokenB: '3',
      reserveA: 50,
      reserveB: 300,
      commission: 0,
      totalLiquidity: 122.47448713,
      'reserveA/reserveB': 0.16666666,
      'reserveB/reserveA': 6,
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      blockCommissionA: 0,
      blockCommissionB: 0,
      rewardPct: 0,
      customRewards: undefined,
      creationTx: expect.any(String),
      creationHeight: expect.any(Number)
    })
  })

  it('should list with pagination', async () => {
    const first = await client.poolpair.list(3)
    expect(first.length).toBe(3)
    expect(first.hasNext).toBe(true)
    expect(first.nextToken).toBe('9')

    expect(first[0].symbol).toBe('A-B')
    expect(first[1].symbol).toBe('A-C')
    expect(first[2].symbol).toBe('A-D')

    const next = await client.paginate(first)
    expect(next.length).toBe(3)
    expect(next.hasNext).toBe(true)
    expect(next.nextToken).toBe('12')

    expect(next[0].symbol).toBe('A-E')
    expect(next[1].symbol).toBe('A-F')
    expect(next[2].symbol).toBe('B-C')

    const last = await client.paginate(next)
    expect(last.length).toBe(2)
    expect(last.hasNext).toBe(false)
    expect(last.nextToken).toBeUndefined()

    expect(last[0].symbol).toBe('B-D')
    expect(last[1].symbol).toBe('B-E')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await client.poolpair.get('A-B')

    expect(response).toEqual({
      symbol: 'A-B',
      name: 'A-B',
      status: true,
      idTokenA: expect.any(String),
      idTokenB: expect.any(String),
      reserveA: new BigNumber('100'),
      reserveB: new BigNumber('200'),
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('141.42135623'),
      'reserveA/reserveB': new BigNumber('0.5'),
      'reserveB/reserveA': new BigNumber('2'),
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      blockCommissionA: new BigNumber('0'),
      blockCommissionB: new BigNumber('0'),
      rewardPct: new BigNumber('0'),
      customRewards: undefined,
      creationTx: expect.any(String),
      creationHeight: expect.any(BigNumber)
    })
  })

  it('should throw error while getting non-existent poolpair', async () => {
    await expect(client.poolpair.get('B-Z')).rejects.toThrow()
  })
})

describe('listPoolShares', () => {
  it('should listPoolShares', async () => {
    const response = await client.poolpair.listPoolShares(30)

    expect(response.length).toBe(3)
    expect(response.hasNext).toBe(false)

    expect(response[1]).toEqual({
      poolID: '8',
      owner: expect.any(String),
      percent: 99,
      amount: 122.47447713,
      totalLiquidity: 122.47448713
    })
  })

  it('should listPoolShares with pagination', async () => {
    const first = await client.poolpair.listPoolShares(2)
    expect(first.length).toBe(2)
    expect(first.hasNext).toBe(true)
    expect(first.nextToken).toBe('8')

    expect(first[0].poolID).toBe('7')
    expect(first[1].poolID).toBe('8')

    const next = await client.paginate(first)
    expect(next.length).toBe(1)
    expect(next.nextToken).toBeUndefined()
    expect(next[0].poolID).toBe('9')
  })
})
