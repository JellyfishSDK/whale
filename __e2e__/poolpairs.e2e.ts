import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(200)
  app = await createTestingApp(container)
  client = app.get(JsonRpcClient)
})

afterAll(async () => {
  await container.stop()
})

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

async function createPoolPair (tokenB: string, metadata?: any): Promise<void> {
  const address = await container.call('getnewaddress')
  const defaultMetadata = {
    tokenA: 'DFI',
    tokenB,
    commission: 0,
    status: true,
    ownerAddress: address
  }
  await client.poolpair.createPoolPair({ ...defaultMetadata, ...metadata })
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

describe('GET: /v1/regtest/poolpairs/shares', () => {
  async function addPoolLiquidity (): Promise<void> {
    const shareAddress = await container.call('getnewaddress')
    const data = await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DSWAP']
    }, shareAddress)

    expect(typeof data).toBe('string')

    await container.generate(1)
  }

  beforeAll(async () => {
    await createToken('DSWAP')

    await mintTokens('DSWAP')

    await createPoolPair('DSWAP')

    await addPoolLiquidity()
    await addPoolLiquidity()
    await addPoolLiquidity()
  })

  it('should fail due to invalid query type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/shares',
      query: {
        start: 'invalid',
        including_start: 'yes',
        limit: '-2'
      }
    })

    expect(res.json()).toEqual({
      statusCode: 400,
      message: [
        'start must be a positive number string',
        'including_start must be a boolean string',
        'limit must be a positive number string'
      ],
      error: 'Bad Request'
    })
  })

  it('should listPoolShares', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/shares'
    })

    expect(res.statusCode).toBe(200)
    const poolShares = res.json().data

    for (let i = 0; i < poolShares.length; i += 1) {
      const data = poolShares[i]
      expect(typeof data.pool_id).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(typeof data.percent).toBe('number')
      expect(typeof data.amount).toBe('number')
      expect(typeof data.total_liquidity).toBe('number')
    }
  })

  it('should listPoolShares with pagination and return an empty object as out of range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/shares',
      query: {
        start: '300',
        including_start: 'true',
        limit: '100'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolShares = res.json().data

    expect(poolShares.length).toBe(0)
  })

  it('should listPoolShares with pagination limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/shares',
      query: {
        start: '0',
        including_start: 'true',
        limit: '2'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolShares = res.json().data

    expect(poolShares.length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/shares',
      query: {
        start: '0',
        including_start: 'true',
        limit: '100',
        verbose: 'false'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolShares = res.json().data

    for (let i = 0; i < poolShares.length; i += 1) {
      const data = poolShares[i]
      expect(typeof data.pool_id).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(typeof data.percent).toBe('number')
    }
  })

  it('should listPoolPairs with is_mine_only true', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/shares',
      query: {
        start: '0',
        including_start: 'true',
        limit: '100',
        verbose: 'true',
        is_mine_only: 'true'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolShares = res.json().data

    for (let i = 0; i < poolShares.length; i += 1) {
      const data = poolShares[i]
      expect(typeof data.pool_id).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(typeof data.percent).toBe('number')
      expect(typeof data.amount).toBe('number')
      expect(typeof data.total_liquidity).toBe('number')
    }
  })
})

describe('GET: /v1/regtest/poolpairs', () => {
  beforeAll(async () => {
    await createToken('DETH')
    await createToken('DXRP')
    await createToken('DUSDT')

    await createPoolPair('DETH', { commission: 0.001 })
    await createPoolPair('DXRP', { commission: 0.003 })
    await createPoolPair('DUSDT', { status: false })
  })

  it('should fail due to invalid query type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs',
      query: {
        start: 'invalid',
        including_start: 'yes',
        limit: '100'
      }
    })

    expect(res.json()).toEqual({
      statusCode: 400,
      message: [
        'start must be a positive number string',
        'including_start must be a boolean string'
      ],
      error: 'Bad Request'
    })
  })

  it('should listPoolPairs', async () => {
    let assertions = 0
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs'
    })

    expect(res.statusCode).toBe(200)
    const poolpairs = res.json().data

    for (let i = 0; i < poolpairs.length; i += 1) {
      const poolpair = poolpairs[i]

      if (poolpair.symbol === 'DFI-DETH') {
        expect(poolpair.name).toBe('Default Defi token-DETH')
        expect(poolpair.status).toBe(true)
        expect(poolpair.commission.toString()).toBe(new BigNumber(0.001).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'DFI-DXRP') {
        expect(poolpair.name).toBe('Default Defi token-DXRP')
        expect(poolpair.status).toBe(true)
        expect(poolpair.commission).toBe(0.003)
        assertions += 1
      }

      if (poolpair.symbol === 'DFI-DUSD') {
        expect(poolpair.name).toBe('Default Defi token-DUSDT')
        expect(poolpair.status).toBe(false)
        expect(poolpair.commission).toBe(0)
        assertions += 1
      }

      expect(typeof poolpair.id).toBe('string')
      expect(typeof poolpair.total_liquidity).toBe('number')
      expect(typeof poolpair.owner_address).toBe('string')
      expect(typeof poolpair.id_token_a).toBe('string')
      expect(typeof poolpair.id_token_b).toBe('string')
      expect(typeof poolpair.reserve_a).toBe('number')
      expect(typeof poolpair.reserve_b).toBe('number')

      if (typeof poolpair.reserve_a_reserve_b === 'number' && typeof poolpair.reserve_b_reserve_a === 'number') {
        expect(poolpair.trade_enabled).toBe(true)
      } else {
        expect(poolpair.reserve_a_reserve_b).toBe('0')
        expect(poolpair.reserve_b_reserve_a).toBe('0')
        expect(poolpair.trade_enabled).toBe(false)
      }

      expect(typeof poolpair.block_commission_a).toBe('number')
      expect(typeof poolpair.block_commission_b).toBe('number')
      expect(typeof poolpair.reward_pct).toBe('number')
      expect(typeof poolpair.creation_height).toBe('number')
      expect(typeof poolpair.creation_tx).toBe('string')
    }

    expect(assertions).toBe(3)
  })

  it('should listPoolPairs with pagination and return an empty object as out of range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs',
      query: {
        start: '300',
        including_start: 'true',
        limit: '100'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolpairs = res.json().data

    expect(poolpairs.length).toBe(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs',
      query: {
        start: '0',
        including_start: 'true',
        limit: '2'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolpairs = res.json().data

    expect(poolpairs.length).toBe(2)

    // test putting query with url should be working as well
    const res1 = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs?start=0&including_start=true&limit=1'
    })

    expect(res1.statusCode).toBe(200)
    const poolpairs1 = res1.json().data

    expect(poolpairs1.length).toBe(1)
  })

  it('should listPoolPairs with verbose false', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs',
      query: {
        start: '0',
        including_start: 'true',
        limit: '100',
        verbose: 'false'
      }
    })

    expect(res.statusCode).toBe(200)
    const poolpairs = res.json().data

    for (let i = 0; i < poolpairs.length; i += 1) {
      const poolpair = poolpairs[i]

      expect(typeof poolpair.symbol).toBe('string')
      expect(typeof poolpair.name).toBe('string')
      expect(typeof poolpair.status).toBe('boolean')
      expect(typeof poolpair.id_token_a).toBe('string')
      expect(typeof poolpair.id_token_b).toBe('string')
    }
  })
})

describe('GET: /v1/regtest/poolpairs/:symbol', () => {
  beforeAll(async () => {
    await createToken('DBCH')
    await createPoolPair('DBCH')
  })

  it('should getPoolPair', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-DBCH'
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data

    expect(data.symbol).toBe('DFI-DBCH')
    expect(data.name).toBe('Default Defi token-DBCH')
    expect(data.status).toBe(true)
    expect(typeof data.id_token_a).toBe('string')
    expect(typeof data.id_token_b).toBe('string')
    expect(typeof data.reserve_a).toBe('number')
    expect(typeof data.reserve_b).toBe('number')
    expect(typeof data.reserve_a_reserve_b).toBe('string')
    expect(typeof data.reserve_b_reserve_a).toBe('string')
    expect(data.trade_enabled).toBe(false)
    expect(typeof data.block_commission_a).toBe('number')
    expect(typeof data.block_commission_b).toBe('number')
    expect(typeof data.reward_pct).toBe('number')
    expect(typeof data.creation_tx).toBe('string')
    expect(typeof data.creation_height).toBe('number')
  })

  it('should getPoolPair with verbose false', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-DBCH',
      query: {
        verbose: 'false'
      }
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data

    expect(data.symbol).toBe('DFI-DBCH')
    expect(data.name).toBe('Default Defi token-DBCH')
    expect(data.status).toBe(true)
    expect(typeof data.id_token_a).toBe('string')
    expect(typeof data.id_token_b).toBe('string')
  })

  it('should throw BadRequestException due to getting non-existent pair', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-NONEXIST'
    })

    expect(res.json()).toEqual({
      statusCode: 400,
      message: 'Bad Request'
    })
  })
})
