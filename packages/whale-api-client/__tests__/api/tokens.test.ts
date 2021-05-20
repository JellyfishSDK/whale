import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { createToken, createPoolPair } from '@defichain/testing'
import { TokenData } from '../../src/api/tokens'

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
  await createToken(container, 'DBTC')
  await createToken(container, 'DETH')
  await createPoolPair(container, 'DBTC', 'DETH')
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('client.tokens.list()', () => {
  it('should listTokens', async () => {
    const result = await client.tokens.list()
    expect(result.length).toBe(4)

    let data = result[0]

    expect(data).toEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: true,
      minted: 0,
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: ''
    })

    data = result[1]

    expect(data).toEqual({
      id: '1',
      symbol: 'DBTC',
      symbolKey: 'DBTC',
      name: 'DBTC',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })

    data = result[2]

    expect(data).toEqual({
      id: '2',
      symbol: 'DETH',
      symbolKey: 'DETH',
      name: 'DETH',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })

    data = result[3]

    expect(data).toEqual({
      id: '3',
      symbol: 'DBTC-DET',
      symbolKey: 'DBTC-DET',
      name: 'DBTC-DETH',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: true,
      finalized: true,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await client.tokens.list(1)

    expect(first.length).toBe(1)
    expect(first.hasNext).toBe(true)
    expect(first.nextToken).toBe('0')

    const second = await client.paginate(first)

    expect(second.length).toBe(1)
    expect(second.hasNext).toBe(true)
    expect(second.nextToken).toBe('1')

    const third = await client.paginate(second)

    expect(third.length).toBe(1)
    expect(third.hasNext).toBe(true)
    expect(third.nextToken).toBe('2')

    const forth = await client.paginate(third)

    expect(forth.length).toBe(1)
    expect(forth.hasNext).toBe(true)
    expect(forth.nextToken).toBe('3')

    const fifth = await client.paginate(forth)

    expect(fifth.length).toBe(0)
    expect(fifth.hasNext).toBe(false)
    expect(fifth.nextToken).toBeUndefined()
  })
})

describe('client.tokens.get()', () => {
  it('should return DFI coin with id as param', async () => {
    const data = await client.tokens.get('0')
    expect(data).toEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: true,
      minted: 0,
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: ''
    })
  })

  it('should return DBTC token with id as param', async () => {
    const data = await client.tokens.get('1')
    expect(data).toEqual({
      id: '1',
      symbol: 'DBTC',
      symbolKey: 'DBTC',
      name: 'DBTC',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should return DETH token with id as param', async () => {
    const data = await client.tokens.get('2')
    expect(data).toEqual({
      id: '2',
      symbol: 'DETH',
      symbolKey: 'DETH',
      name: 'DETH',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should return DBTC-DETH LP token with id as param', async () => {
    const data = await client.tokens.get('3')
    expect(data).toEqual({
      id: '3',
      symbol: 'DBTC-DET',
      symbolKey: 'DBTC-DET',
      name: 'DBTC-DETH',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: true,
      finalized: true,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should fail due to id is not found', async () => {
    const call = async (): Promise<TokenData> => await client.tokens.get('4')
    await expect(call).rejects
      .toThrow('400 - BadRequest (/v1/regtest/tokens/4)')
  })

  it('should fail due to id is malformed', async () => {
    const call = async (): Promise<TokenData> => await client.tokens.get('$*@')
    await expect(call).rejects
      .toThrow('400 - BadRequest (/v1/regtest/tokens/$*@): Validation failed (numeric string is expected)')
  })
})
