import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { createToken } from '@defichain/testing'
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
  await createToken(container, 'DSWAP')
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
    expect(result.length).toBe(2)
    for (let i = 0; i < result.length; i++) {
      const data = result[i]
      switch (data.symbol) {
        case 'DFI':
          expect(data.symbol).toBe('DFI')
          expect(data.symbolKey).toBe('DFI')
          expect(data.name).toBe('Default Defi token')
          expect(data.decimal).toBe(8)
          expect(data.limit).toBe(0)
          expect(data.mintable).toBe(false)
          expect(data.tradeable).toBe(true)
          expect(data.isDAT).toBe(true)
          expect(data.isLPS).toBe(false)
          expect(data.finalized).toBe(true)
          expect(data.minted).toBe(0)
          expect(data.creation.tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.creation.height).toBe(0)
          expect(data.destruction.tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.destruction.height).toBe(-1)
          expect(data.collateralAddress).toBe('')
          break
        case 'DSWAP':
          expect(data.symbol).toBe('DSWAP')
          expect(data.symbolKey).toBe('DSWAP')
          expect(data.name).toBe('DSWAP')
          expect(data.decimal).toBe(8)
          expect(data.limit).toBe(0)
          expect(data.mintable).toBe(true)
          expect(data.tradeable).toBe(true)
          expect(data.isDAT).toBe(true)
          expect(data.isLPS).toBe(false)
          expect(data.finalized).toBe(false)
          expect(data.minted).toBe(0)
          expect(typeof data.creation.tx).toBe('string')
          expect(data.creation.height).toBeGreaterThan(0)
          expect(data.destruction.tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.destruction.height).toBe(-1)
          expect(typeof data.collateralAddress).toBe('string')
          break
      }
    }
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

    expect(third.length).toBe(0)
    expect(third.hasNext).toBe(false)
    expect(third.nextToken).toBeUndefined()
  })
})

describe('client.tokens.get()', () => {
  it('should return DFI coin with id as param', async () => {
    const data = await client.tokens.get('0')
    expect(data.symbol).toBe('DFI')
    expect(data.symbolKey).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(false)
    expect(data.tradeable).toBe(true)
    expect(data.isDAT).toBe(true)
    expect(data.isLPS).toBe(false)
    expect(data.finalized).toBe(true)
    expect(data.minted).toBe(0)
    expect(data.creation.tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creation.height).toBe(0)
    expect(data.destruction.tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction.height).toBe(-1)
    expect(data.collateralAddress).toBe('')
  })

  it('should return DSWAP token with id as param', async () => {
    const data = await client.tokens.get('1')
    expect(data.symbol).toBe('DSWAP')
    expect(data.symbolKey).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(true)
    expect(data.tradeable).toBe(true)
    expect(data.isDAT).toBe(true)
    expect(data.isLPS).toBe(false)
    expect(data.finalized).toBe(false)
    expect(data.minted).toBe(0)
    expect(typeof data.creation.tx).toBe('string')
    expect(data.creation.height).toBeGreaterThan(0)
    expect(data.destruction.tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction.height).toBe(-1)
    expect(typeof data.collateralAddress).toBe('string')
  })

  it('should fail due to id is malformed', async () => {
    const call = async (): Promise<TokenData> => await client.tokens.get('$*@')
    await expect(call).rejects
      .toThrow('400 - BadRequest (/v1/regtest/tokens/$*@)')
  })
})
