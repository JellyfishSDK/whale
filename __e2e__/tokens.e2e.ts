import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(200)
  app = await createTestingApp(container)
})

afterAll(async () => {
  await container.stop()
})

export interface TokenInfoDto {
  symbol: string
  symbol_key: string
  name: string
  decimal: number
  limit: number
  mintable: boolean
  tradeable: boolean
  is_dat: boolean
  is_lps: boolean
  finalized: boolean
  minted: number
  creation_tx: string
  creation_height: number
  destruction_tx: string
  destruction_height: number
  collateral_address: string
}

describe('GET: /v1/regtest/tokens/:id for DFI coin', () => {
  function expectDFI (data: TokenInfoDto): void {
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
  }

  it('should return DFI coin with id as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/0'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expectDFI(data)
  })

  it('should return DFI coin with symbol as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/DFI'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expectDFI(data)
  })

  it('should return DFI coin with creationTx as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/0000000000000000000000000000000000000000000000000000000000000000'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expectDFI(data)
  })
})

describe('GET: /v1/regtest/tokens/:id for newly created token', () => {
  function expectDSWAP (data: TokenInfoDto): void {
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
    expect(data.minted).toBe(2000)
    expect(typeof data.creation_tx).toBe('string')
    expect(data.creation_height).toBe(107)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(typeof data.collateral_address).toBe('string')
  }

  async function createToken (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)
  }

  async function mintTokens (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')

    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
    await container.call('minttokens', [`2000@${symbol}`])

    await container.generate(25)
  }

  beforeAll(async () => {
    await createToken('DSWAP')
    await mintTokens('DSWAP')
  })

  it('should return DSWAP token with id as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/1'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expectDSWAP(data)
  })

  it('should return DSWAP token with symbol as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/DSWAP'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expectDSWAP(data)
  })

  it('should return DSWAP token with creationTx as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/1'
    })

    let data: TokenInfoDto = res.json().data

    const res1 = await app.inject({
      method: 'GET',
      url: `/v1/regtest/tokens/${data.creation_tx}`
    })

    expect(res1.statusCode).toBe(200)
    data = res1.json().data
    expectDSWAP(data)
  })
})

describe('GET: /v1/regtest/tokens/:id for token which does not exist', () => {
  it('should return 400 if token not found with id as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/2'
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Token not found',
      statusCode: 400
    })
  })

  it('should return 400 if token not found with symbol as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/MOCK'
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Token not found',
      statusCode: 400
    })
  })

  it('should return 400 if token not found with creationTx as param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/0000000000000000000000000000000000000000000000000000000000000001'
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Token not found',
      statusCode: 400
    })
  })
})

describe('GET: /v1/regtest/tokens/:id for malformed id', () => {
  it('should return 400 if id is malformed', async () => {
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
