import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { PoolPairsController } from '@src/module.api/poolpairs.controller'
import { BadRequestException } from '@nestjs/common'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: PoolPairsController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(200)
  client = new JsonRpcClient(await container.getCachedRpcUrl())
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

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(11)

  const app: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      load: [() => ({ network: 'regtest' })]
    })],
    controllers: [PoolPairsController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()

  controller = app.get<PoolPairsController>(PoolPairsController)
})

describe('controller.addPoolLiquidity()', () => {
  beforeAll(async () => {
    await createToken('DDAI')

    await mintTokens('DDAI')

    await createPoolPair('DDAI')
  })

  it('should addPoolLiquidity', async () => {
    const shareAddress = await container.call('getnewaddress')

    const body = {
      from: {
        '*': ['10@DFI', '200@DDAI']
      },
      shareAddress
    }
    const data = await controller.addPoolLiquidity(body)

    expect(typeof data).toBe('string')
  })

  it('should addPoolLiquidity with specific input token address', async () => {
    const tokenAAddress = await container.call('getnewaddress')
    const tokenBAddress = await container.call('getnewaddress')
    await container.call('sendtokenstoaddress', [{}, { [tokenAAddress]: ['10@DFI'] }])
    await container.call('sendtokenstoaddress', [{}, { [tokenBAddress]: ['200@DDAI'] }])
    await container.generate(25)

    const shareAddress = await container.call('getnewaddress')

    const body = {
      from: {
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      },
      shareAddress
    }
    const data = await controller.addPoolLiquidity(body)

    expect(typeof data).toBe('string')
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

    const body = {
      from: {
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      },
      shareAddress,
      options: {
        utxos: inputs
      }
    }

    const data = await controller.addPoolLiquidity(body)

    expect(typeof data).toBe('string')
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

    const body = {
      from: {
        [tokenAAddress]: '5@DFI',
        [tokenBAddress]: '100@DDAI'
      },
      shareAddress,
      options: {
        utxos: inputs
      }
    }

    const promise = controller.addPoolLiquidity(body)
    await expect(promise).rejects.toThrow(BadRequestException)
  })
})

describe('controller.listPoolShares()', () => {
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
    const poolShares = await controller.listPoolShares()

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
    const query = {
      pagination: {
        start: 300,
        including_start: true,
        limit: 100
      }
    }
    const poolShares = await controller.listPoolShares(query)

    expect(Object.keys(poolShares).length).toBe(0)
  })

  it('should listPoolShares with pagination limit', async () => {
    const query = {
      pagination: {
        start: 0,
        including_start: true,
        limit: 2
      }
    }
    const poolShares = await controller.listPoolShares(query)

    expect(Object.keys(poolShares).length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const query = {
      pagination: {
        start: 0,
        including_start: true,
        limit: 100
      },
      verbose: false
    }
    const poolShares = await controller.listPoolShares(query)

    for (const k in poolShares) {
      const data = poolShares[k]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data['%'] instanceof BigNumber).toBe(true)
    }
  })

  it('should listPoolPairs with isMineOnly true', async () => {
    const query = {
      pagination: {
        start: 0,
        including_start: true,
        limit: 100
      },
      verbose: true,
      options: {
        isMineOnly: true
      }
    }
    const poolShares = await controller.listPoolShares(query)
    console.log('poolShares: ', poolShares)

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

describe('controller.create()', () => {
  it('should throw BadRequestExeception due to tokenB is not exists', async () => {
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

    await expect(controller.create(payload)).rejects.toThrow(BadRequestException)
  })

  it('should create pool pair', async () => {
    await createToken('DBTC')

    let assertions = 0
    const poolpairsBefore = await controller.list()
    const poolpairsLengthBefore = Object.keys(poolpairsBefore).length

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
    const hashed = await controller.create(payload)
    expect(typeof hashed).toBe('string')

    await container.generate(1)

    const poolpairsAfter = await controller.list()
    expect(Object.keys(poolpairsAfter).length).toBe(poolpairsLengthBefore + 1)

    const { metadata } = payload
    for (const k in poolpairsAfter) {
      const poolpair = poolpairsAfter[k]
      if (poolpair.name === 'Default Defi token-DBTC') {
        expect(poolpair.symbol).toBe(`${metadata.tokenA}-${metadata.tokenB}`)
        expect(poolpair.status).toBe(metadata.status)
        expect(poolpair.commission.toString()).toBe(new BigNumber(metadata.commission).toString())
        expect(poolpair.ownerAddress).toBe(metadata.ownerAddress)
        expect(poolpair.totalLiquidity instanceof BigNumber).toBe(true)
        expect(typeof poolpair.idTokenA).toBe('string')
        expect(typeof poolpair.idTokenB).toBe('string')
        expect(poolpair.reserveA instanceof BigNumber).toBe(true)
        expect(poolpair.reserveB instanceof BigNumber).toBe(true)
        expect(typeof poolpair['reserveA/reserveB']).toBe('string')
        expect(typeof poolpair['reserveB/reserveA']).toBe('string')
        expect(poolpair.tradeEnabled).toBe(false)
        expect(poolpair.blockCommissionA instanceof BigNumber).toBe(true)
        expect(poolpair.blockCommissionB instanceof BigNumber).toBe(true)
        expect(poolpair.rewardPct instanceof BigNumber).toBe(true)
        expect(typeof poolpair.creationTx).toBe('string')
        expect(poolpair.creationHeight instanceof BigNumber).toBe(true)
        assertions += 1
      }
    }
    expect(assertions).toBe(1)
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

    await expect(controller.create(payload)).rejects.toThrow(BadRequestException)
  })
})

describe('controller.list()', () => {
  beforeAll(async () => {
    await createToken('DETH')
    await createToken('DXRP')
    await createToken('DUSDT')

    await createPoolPair('DETH', { commission: 0.001 })
    await createPoolPair('DXRP', { commission: 0.003 })
    await createPoolPair('DUSDT', { status: false })
  })

  it('should list poor pairs', async () => {
    let assertions = 0
    const poolpairs = await controller.list()

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
    const query = {
      pagination: {
        start: 300,
        including_start: true,
        limit: 100
      }
    }
    const poolpairs = await controller.list(query)

    expect(Object.keys(poolpairs).length).toBe(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const query = {
      pagination: {
        start: 0,
        including_start: true,
        limit: 2
      }
    }
    const poolpairs = await controller.list(query)

    expect(Object.keys(poolpairs).length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const query = {
      pagination: {
        start: 0,
        including_start: true,
        limit: 100
      },
      verbose: false
    }
    const poolpairs = await controller.list(query)

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

describe('controller.get()', () => {
  beforeAll(async () => {
    await createToken('DBCH')
    await createPoolPair('DBCH')
  })

  it('should getPoolPair', async () => {
    const poolpair = await controller.get('DFI-DBCH')

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
    const poolpair = await controller.get('DFI-DBCH', { verbose: false })

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
    await expect(controller.get('DFI-NONEXIST')).rejects.toThrow(BadRequestException)
  })
})
