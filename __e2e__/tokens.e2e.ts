import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createToken } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  app = await createTestingApp(container)
  await createToken(container, 'DSWAP')
})

afterAll(async () => {
  await container.stop()
})

describe('GET: /v1/regtest/tokens', () => {
  it('should return all tokens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/tokens'
    })

    expect(res.statusCode).toBe(200)
    const result = res.json().data

    expect(result.length).toBe(2)

    for (const k in result) {
      const data = result[k]

      switch (data.symbol) {
        case 'DFI':
          expect(data.symbol).toBe('DFI')
          expect(data.symbol_key).toBe('DFI')
          expect(data.name).toBe('Default Defi token')
          expect(data.decimal).toBe(8)
          expect(data.limit).toBe(0)
          expect(data.mintable).toBe(false)
          expect(data.tradeable).toBe(true)
          expect(data.is_dat).toBe(true)
          expect(data.is_lps).toBe(false)
          expect(data.finalized).toBe(true)
          expect(data.minted).toBe(0)
          expect(data.creation_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.creation_height).toBe(0)
          expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.destruction_height).toBe(-1)
          expect(data.collateral_address).toBe('')
          break
        case 'DSWAP':
          expect(data.symbol).toBe('DSWAP')
          expect(data.symbol_key).toBe('DSWAP')
          expect(data.name).toBe('DSWAP')
          expect(data.decimal).toBe(8)
          expect(data.limit).toBe(0)
          expect(data.mintable).toBe(true)
          expect(data.tradeable).toBe(true)
          expect(data.is_dat).toBe(true)
          expect(data.is_lps).toBe(false)
          expect(data.finalized).toBe(false)
          expect(data.minted).toBe(0)
          expect(typeof data.creation_tx).toBe('string')
          expect(data.creation_height).toBeGreaterThan(0)
          expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.destruction_height).toBe(-1)
          expect(typeof data.collateral_address).toBe('string')
          break
      }
    }
  })

  it('should return tokens with size 2 next 0', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/tokens',
      query: {
        size: '2',
        next: '0'
      }
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data

    expect(data.length).toBe(2)
  })

  it('should return an empty object if size 100 next 300 which is out of range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/tokens',
      query: {
        size: '100',
        next: '300'
      }
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data

    expect(data.length).toBe(0)
  })

  it('should fail due to invalid size', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/tokens',
      query: {
        size: '-2',
        next: '0'
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: ['size must be a positive number string'],
      statusCode: 400
    })
  })

  it('should fail due to invalid next', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/tokens',
      query: {
        size: '0',
        next: '-2'
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: ['next must be a positive number string'],
      statusCode: 400
    })
  })
})

describe('GET: /v1/regtest/tokens/:id for DFI coin', () => {
  it('should return DFI coin with id as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/0'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data

    expect(data.symbol).toBe('DFI')
    expect(data.symbol_key).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(false)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(true)
    expect(data.minted).toBe(0)
    expect(data.creation_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creation_height).toBe(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(data.collateral_address).toBe('')
  })
})

describe('GET: /v1/regtest/tokens/:id for newly created token', () => {
  it('should return DSWAP token with id as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/1'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbol_key).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(true)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(false)
    expect(data.minted).toBe(0)
    expect(typeof data.creation_tx).toBe('string')
    expect(data.creation_height).toBeGreaterThan(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(typeof data.collateral_address).toBe('string')
  })
})

describe('GET: /v1/regtest/tokens/:id for malformed id', () => {
  it('should fail due to id is malformed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/$*@'
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Token not found',
      statusCode: 400
    })
  })
})
