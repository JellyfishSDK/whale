import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { getNewAddress, createToken, mintTokens, createPoolPair } from '@defichain/testing'

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

describe('GET: /v1/regtest/poolpairs/shares', () => {
  async function addPoolLiquidity (): Promise<void> {
    const shareAddress = await getNewAddress(container)
    const data = await client.poolpair.addPoolLiquidity({
      '*': ['10@DFI', '200@DSWAP']
    }, shareAddress)

    expect(typeof data).toBe('string')

    await container.generate(1)
  }

  beforeAll(async () => {
    await createToken(container, 'DSWAP')

    await mintTokens(container, 'DSWAP')

    await createPoolPair(container, 'DFI', 'DSWAP')

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
      error: {
        at: expect.any(Number),
        code: 400,
        message: 'Bad Request Exception',
        type: 'BadRequest',
        url: '/v1/regtest/poolpairs/shares?start=invalid&including_start=yes&limit=-2'
      }
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
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(typeof data.percent).toBe('number')
      expect(typeof data.amount).toBe('number')
      expect(typeof data.totalLiquidity).toBe('number')
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
      expect(typeof data.poolID).toBe('string')
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
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(typeof data.percent).toBe('number')
      expect(typeof data.amount).toBe('number')
      expect(typeof data.totalLiquidity).toBe('number')
    }
  })
})

describe('GET: /v1/regtest/poolpairs', () => {
  beforeAll(async () => {
    await createToken(container, 'DETH')
    await createToken(container, 'DXRP')
    await createToken(container, 'DUSDT')

    await createPoolPair(container, 'DFI', 'DETH', { commission: 0.001 })
    await createPoolPair(container, 'DFI', 'DXRP', { commission: 0.003 })
    await createPoolPair(container, 'DFI', 'DUSDT', { status: false })
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
      error: {
        at: expect.any(Number),
        code: 400,
        message: 'Bad Request Exception',
        type: 'BadRequest',
        url: '/v1/regtest/poolpairs?start=invalid&including_start=yes&limit=100'
      }
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
      expect(typeof poolpair.totalLiquidity).toBe('number')
      expect(typeof poolpair.ownerAddress).toBe('string')
      expect(typeof poolpair.idTokenA).toBe('string')
      expect(typeof poolpair.idTokenB).toBe('string')
      expect(typeof poolpair.reserveA).toBe('number')
      expect(typeof poolpair.reserveB).toBe('number')

      if (typeof poolpair['reserveA/reserveB'] === 'number' && typeof poolpair['reserveB/reserveA'] === 'number') {
        expect(poolpair.tradeEnabled).toBe(true)
      } else {
        expect(poolpair['reserveA/reserveB']).toBe('0')
        expect(poolpair['reserveB/reserveA']).toBe('0')
        expect(poolpair.tradeEnabled).toBe(false)
      }

      expect(typeof poolpair.blockCommissionA).toBe('number')
      expect(typeof poolpair.blockCommissionB).toBe('number')
      expect(typeof poolpair.rewardPct).toBe('number')
      expect(typeof poolpair.creationHeight).toBe('number')
      expect(typeof poolpair.creationTx).toBe('string')
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
      expect(typeof poolpair.idTokenA).toBe('string')
      expect(typeof poolpair.idTokenB).toBe('string')
    }
  })
})

describe('GET: /v1/regtest/poolpairs/:symbol', () => {
  beforeAll(async () => {
    await createToken(container, 'DBCH')
    await createPoolPair(container, 'DFI', 'DBCH')
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
    expect(typeof data.idTokenA).toBe('string')
    expect(typeof data.idTokenB).toBe('string')
    expect(typeof data.reserveA).toBe('number')
    expect(typeof data.reserveB).toBe('number')
    expect(typeof data['reserveA/reserveB']).toBe('string')
    expect(typeof data['reserveB/reserveA']).toBe('string')
    expect(data.tradeEnabled).toBe(false)
    expect(typeof data.blockCommissionA).toBe('number')
    expect(typeof data.blockCommissionB).toBe('number')
    expect(typeof data.rewardPct).toBe('number')
    expect(typeof data.creationTx).toBe('string')
    expect(typeof data.creationHeight).toBe('number')
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
    expect(typeof data.idTokenA).toBe('string')
    expect(typeof data.idTokenB).toBe('string')
  })

  it('should throw BadRequestException due to getting non-existent pair', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-NONEXIST'
    })

    expect(res.json()).toEqual({
      error: {
        at: expect.any(Number),
        code: 400,
        message: 'Bad Request',
        type: 'BadRequest',
        url: '/v1/regtest/poolpairs/DFI-NONEXIST'
      }
    })
  })
})
