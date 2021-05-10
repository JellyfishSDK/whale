import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { PoolPairsController } from '@src/module.api/poolpairs.controller'
import { BadRequestException } from '@nestjs/common'
import BigNumber from 'bignumber.js'
import { PoolPairsFilter } from '../module.api/poolpairs.controller'

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

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      load: [() => ({ network: 'regtest' })]
    })],
    controllers: [PoolPairsController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()

  controller = app.get<PoolPairsController>(PoolPairsController)
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

    for (let i = 0; i < poolShares.length; i += 1) {
      const data = poolShares[i]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data.percent instanceof BigNumber).toBe(true)
      expect(data.amount instanceof BigNumber).toBe(true)
      expect(data.totalLiquidity instanceof BigNumber).toBe(true)
    }
  })

  it('should listPoolShares with pagination and return an empty object as out of range', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 300,
      including_start: true,
      limit: 100
    }

    const poolShares = await controller.listPoolShares(filter)

    expect(poolShares.length).toBe(0)
  })

  it('should listPoolShares with pagination limit', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 2
    }
    const poolShares = await controller.listPoolShares(filter)

    expect(poolShares.length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 100
    }
    filter.verbose = false

    const poolShares = await controller.listPoolShares(filter)

    for (let i = 0; i < poolShares.length; i += 1) {
      const data = poolShares[i]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data.percent instanceof BigNumber).toBe(true)
    }
  })

  it('should listPoolPairs with isMineOnly true', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 100
    }
    filter.verbose = true
    filter.options = {
      isMineOnly: true
    }

    const poolShares = await controller.listPoolShares(filter)

    for (let i = 0; i < poolShares.length; i += 1) {
      const data = poolShares[i]
      expect(typeof data.poolID).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data.percent instanceof BigNumber).toBe(true)
      expect(data.amount instanceof BigNumber).toBe(true)
      expect(data.totalLiquidity instanceof BigNumber).toBe(true)
    }
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

  it('should listPoolPairs', async () => {
    let assertions = 0
    const poolpairs = await controller.list()

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
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 300,
      including_start: true,
      limit: 100
    }

    const poolpairs = await controller.list(filter)

    expect(poolpairs.length).toBe(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 2
    }
    const poolpairs = await controller.list(filter)

    expect(poolpairs.length).toBe(2)
  })

  it('should listPoolPairs with verbose false', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 100
    }
    filter.verbose = false
    const poolpairs = await controller.list(filter)

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

describe('controller.get()', () => {
  beforeAll(async () => {
    await createToken('DBCH')
    await createPoolPair('DBCH')
  })

  it('should getPoolPair', async () => {
    const data = await controller.get('DFI-DBCH')

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
  })

  it('should getPoolPair with verbose false', async () => {
    const filter = new PoolPairsFilter()
    filter.verbose = false

    const data = await controller.get('DFI-DBCH', filter)
    expect(data.symbol).toBe('DFI-DBCH')
    expect(data.name).toBe('Default Defi token-DBCH')
    expect(data.status).toBe(true)
    expect(typeof data.idTokenA).toBe('string')
    expect(typeof data.idTokenB).toBe('string')
  })

  it('should throw BadRequestException due to getting non-existent pair', async () => {
    await expect(controller.get('DFI-NONEXIST')).rejects.toThrow(BadRequestException)
  })
})
