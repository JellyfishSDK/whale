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

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(15)
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

describe('POST: /v1/regtest/poolpairs/liquidity', () => {
  beforeAll(async () => {
    await createToken('DDAI')

    await mintTokens('DDAI')

    await createPoolPair('DDAI')
  })

  it('should addPoolLiquidity', async () => {
    const shareAddress = await container.call('getnewaddress')

    const payload = {
      from: {
        '*': ['10@DFI', '200@DDAI']
      },
      shareAddress
    }

    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/liquidity',
      payload
    })

    expect(typeof res.json().data).toBe('string')
  })

  it('should addPoolLiquidity with specific input token address', async () => {
    const tokenAAddress = await container.call('getnewaddress')
    const tokenBAddress = await container.call('getnewaddress')
    await container.call('sendtokenstoaddress', [{}, { [tokenAAddress]: ['10@DFI'] }])
    await container.call('sendtokenstoaddress', [{}, { [tokenBAddress]: ['200@DDAI'] }])
    await container.generate(25)

    const shareAddress = await container.call('getnewaddress')

    const payload = {
      from: {
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      },
      shareAddress
    }
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/liquidity',
      payload
    })

    expect(typeof res.json().data).toBe('string')
  })

  it('should addPoolLiquidity with utxos', async () => {
    const shareAddress = await container.call('getnewaddress')
    const tokenAAddress = await container.call('getnewaddress')
    const tokenBAddress = await container.call('getnewaddress')
    await container.call('sendtokenstoaddress', [{}, { [tokenAAddress]: ['10@DFI'] }])
    await container.call('sendtokenstoaddress', [{}, { [tokenBAddress]: ['200@DDAI'] }])
    await container.generate(25)

    const txid = await container.call('sendmany', ['', {
      [tokenAAddress]: 10,
      [tokenBAddress]: 20
    }])
    await container.generate(2)

    const utxos = await container.call('listunspent')
    const inputs = utxos.filter((utxo: any) => utxo.txid === txid).map((utxo: any) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const payload = {
      from: {
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      },
      shareAddress,
      options: {
        utxos: inputs
      }
    }

    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/liquidity',
      payload
    })

    expect(typeof res.json().data).toBe('string')
  })

  it('should throw BadRequestException due to the utxos which does not include account owner', async () => {
    const shareAddress = await container.call('getnewaddress')
    const tokenAAddress = await container.call('getnewaddress')
    const tokenBAddress = await container.call('getnewaddress')

    const utxos = await container.call('listunspent')
    const inputs = utxos.map((utxo: any) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const payload = {
      from: {
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      },
      shareAddress,
      options: {
        utxos: inputs
      }
    }

    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/liquidity',
      payload
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      statusCode: 400,
      message: ['tx must have at least one input from account owner'],
      error: 'Bad Request'
    })
  })
})

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

  it('should listPoolShares', async () => {
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/shares'
    })

    const poolShares = res.json().data

    for (const k in poolShares) {
      const data = poolShares[k]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data['%'] instanceof BigNumber).toBe(true)
      expect(data.amount instanceof BigNumber).toBe(true)
      expect(data.totalLiquidity instanceof BigNumber).toBe(true)
    }
  })

  it('should listPoolShares with pagination and return an empty object as out of range', async () => {
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/shares?start=300&including_start=true&limit=100'
    })

    const poolShares = res.json().data

    expect(Object.keys(poolShares).length).toBe(0)
  })

  it('should listPoolShares with pagination limit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/shares?start=0&including_start=true&limit=2'
    })

    const poolShares = res.json().data

    expect(Object.keys(poolShares).length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/shares?start=0&including_start=true&limit=100&verbose=false'
    })

    const poolShares = res.json().data

    for (const k in poolShares) {
      const data = poolShares[k]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data['%'] instanceof BigNumber).toBe(true)
    }
  })

  it('should listPoolPairs with isMineOnly true', async () => {
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs/shares?start=0&including_start=true&limit=100&verbose=true&isMineOnly=true'
    })

    const poolShares = res.json().data

    for (const k in poolShares) {
      const data = poolShares[k]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data['%'] instanceof BigNumber).toBe(true)
      expect(data.amount instanceof BigNumber).toBe(true)
      expect(data.totalLiquidity instanceof BigNumber).toBe(true)
    }
  })
})

describe('POST: /v1/regtest/poolpairs', () => {
  beforeAll(async () => {
    await createToken('DBTC')
  })

  it('should throw BadRequestExeception due to tokenB is not exists', async () => {
    const address = await container.call('getnewaddress')
    const payload = {
      metadata: {
        tokenA: 'DFI',
        tokenB: 'DDD',
        commission: 0,
        status: true,
        ownerAddress: address
      }
    }
    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs',
      payload
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      statusCode: 400,
      message: ['TokenB was not found'],
      error: 'Bad Request'
    })
  })

  it('should create pool pair', async () => {
    const address = await container.call('getnewaddress')
    const payload = {
      metadata: {
        tokenA: 'DFI',
        tokenB: 'DBTC',
        commission: 0,
        status: true,
        ownerAddress: address
      }
    }

    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs',
      payload
    })

    expect(res.statusCode).toBe(200)
    expect(typeof res.json().data).toEqual('string')
  })

  it('should throw BadRequestExeception due to token \'DFI-DBTC\' already exists!', async () => {
    const address = await container.call('getnewaddress')
    const payload = {
      metadata: {
        tokenA: 'DFI',
        tokenB: 'DBTC',
        commission: 0,
        status: true,
        ownerAddress: address
      }
    }

    const res = await app.inject({
      method: 'POST',
      url: 'v1/regtest/poolpairs',
      payload
    })

    expect(res.statusCode).toBe(400)
    expect(typeof res.json().data).toEqual('string')

    expect(res.json()).toEqual({
      statusCode: 400,
      message: ['token \'DFI-DBTC\' already exists!'],
      error: 'Bad Request'
    })
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

  it('should listPoolPairs', async () => {
    let assertions = 0
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs'
    })

    const poolpairs = res.json().data

    for (const k in poolpairs) {
      const poolpair = poolpairs[k]

      if (poolpair.symbol === 'DFI-DETH') {
        expect(poolpair.name).toBe('Default Defi token-DETH')
        expect(poolpair.status).toBe(true)
        expect(poolpair.commission.toString()).toBe(new BigNumber(0.001).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'DFI-DXRP') {
        expect(poolpair.name).toBe('Default Defi token-DXRP')
        expect(poolpair.status).toBe(true)
        expect(poolpair.commission.toString()).toBe(new BigNumber(0.003).toString())
        assertions += 1
      }

      if (poolpair.symbol === 'DFI-DUSD') {
        expect(poolpair.name).toBe('Default Defi token-DUSDT')
        expect(poolpair.status).toBe(false)
        expect(poolpair.commission.toString()).toBe(new BigNumber(0).toString())
        assertions += 1
      }

      expect(poolpair.totalLiquidity instanceof BigNumber).toBe(true)
      expect(typeof poolpair.ownerAddress).toBe('string')
      expect(typeof poolpair.idTokenA).toBe('string')
      expect(typeof poolpair.idTokenB).toBe('string')
      expect(poolpair.reserveA instanceof BigNumber).toBe(true)
      expect(poolpair.reserveB instanceof BigNumber).toBe(true)

      if (poolpair['reserveA/reserveB'] instanceof BigNumber && poolpair['reserveB/reserveA'] instanceof BigNumber) {
        expect(poolpair.tradeEnabled).toBe(true)
      } else {
        expect(poolpair['reserveA/reserveB']).toBe('0')
        expect(poolpair['reserveB/reserveA']).toBe('0')
        expect(poolpair.tradeEnabled).toBe(false)
      }

      expect(poolpair.blockCommissionA instanceof BigNumber).toBe(true)
      expect(poolpair.blockCommissionB instanceof BigNumber).toBe(true)
      expect(poolpair.rewardPct instanceof BigNumber).toBe(true)
      expect(typeof poolpair.creationTx).toBe('string')
      expect(poolpair.creationHeight instanceof BigNumber).toBe(true)
    }

    expect(assertions).toBe(3)
  })

  it('should listPoolPairs with pagination and return an empty object as out of range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs?start=300&including_start=true&limit=100'
    })

    const poolpairs = res.json().data

    expect(Object.keys(poolpairs).length).toBe(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs?start=0&including_start=true&limit=2'
    })

    const poolpairs = res.json().data

    expect(Object.keys(poolpairs).length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs?start=0&including_start=true&limit=100&verbose=false'
    })

    const poolpairs = res.json().data

    for (const k in poolpairs) {
      const poolpair = poolpairs[k]

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
    await createToken('DBCH')
    await createPoolPair('DBCH')
  })

  it('should getPoolPair', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-DBCH'
    })

    const poolpair = res.json().data

    for (const k in poolpair) {
      const data = poolpair[k]
      expect(data.symbol).toBe('DFI-DBCH')
      expect(data.name).toBe('Default Defi token-DBCH')
      expect(data.status).toBe(true)
      expect(typeof data.idTokenA).toBe('string')
      expect(typeof data.idTokenB).toBe('string')
      expect(data.reserveA instanceof BigNumber).toBe(true)
      expect(data.reserveB instanceof BigNumber).toBe(true)
      expect(typeof data['reserveA/reserveB']).toBe('string')
      expect(typeof data['reserveB/reserveA']).toBe('string')
      expect(data.tradeEnabled).toBe(false)
      expect(data.blockCommissionA instanceof BigNumber).toBe(true)
      expect(data.blockCommissionB instanceof BigNumber).toBe(true)
      expect(data.rewardPct instanceof BigNumber).toBe(true)
      expect(typeof data.creationTx).toBe('string')
      expect(data.creationHeight instanceof BigNumber).toBe(true)
    }
  })

  it('should getPoolPair with verbose false', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-DBCH?verbose=false'
    })

    const poolpair = res.json().data

    for (const k in poolpair) {
      const data = poolpair[k]
      expect(data.symbol).toBe('DFI-DBCH')
      expect(data.name).toBe('Default Defi token-DBCH')
      expect(data.status).toBe(true)
      expect(typeof data.idTokenA).toBe('string')
      expect(typeof data.idTokenB).toBe('string')
    }
  })

  it('should throw BadRequestException due to getting non-existent pair', async () => {
    const res = await app.inject({
      method: 'GET',
      url: 'v1/regtest/poolpairs/DFI-NONEXIST'
    })

    expect(res.statusCode).toBe(400)
    expect(typeof res.json().data).toEqual('string')

    expect(res.json()).toEqual({
      statusCode: 400,
      message: ['token \'DFI-NONEXIST\' is not exists!'],
      error: 'Bad Request'
    })
  })
})
