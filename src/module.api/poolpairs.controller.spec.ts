import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ConfigModule } from '@nestjs/config'
import { PoolPairsController } from '@src/module.api/poolpairs.controller'
import { BadRequestException } from '@nestjs/common'
import BigNumber from 'bignumber.js'
import { PoolPairsFilter, PoolShareInfoDto, PoolPairInfoDto } from '../module.api/poolpairs.controller'

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

    for (const k in poolShares) {
      const data = poolShares[k] as PoolShareInfoDto
      expect(typeof data.pool_id).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data.percent instanceof BigNumber).toBe(true)
      expect(data.amount instanceof BigNumber).toBe(true)
      expect(data.total_liquidity instanceof BigNumber).toBe(true)
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

    expect(Object.keys(poolShares).length).toBe(0)
  })

  it('should listPoolShares with pagination limit', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 2
    }
    const poolShares = await controller.listPoolShares(filter)

    expect(Object.keys(poolShares).length).toBe(2)
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

    for (const k in poolShares) {
      const data = poolShares[k] as PoolShareInfoDto
      expect(typeof data.pool_id).toBe('string')
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

    for (const k in poolShares) {
      const data = poolShares[k] as PoolShareInfoDto
      expect(typeof data.pool_id).toBe('string')
      expect(typeof data.owner).toBe('string')
      expect(data.percent instanceof BigNumber).toBe(true)
      expect(data.amount instanceof BigNumber).toBe(true)
      expect(data.total_liquidity instanceof BigNumber).toBe(true)
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

    for (const k in poolpairs) {
      const poolpair = poolpairs[k] as PoolPairInfoDto

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

      expect(poolpair.total_liquidity instanceof BigNumber).toBe(true)
      expect(typeof poolpair.owner_address).toBe('string')
      expect(typeof poolpair.id_token_a).toBe('string')
      expect(typeof poolpair.id_token_b).toBe('string')
      expect(poolpair.reserve_a instanceof BigNumber).toBe(true)
      expect(poolpair.reserve_b instanceof BigNumber).toBe(true)

      if (poolpair.reserve_a_reserve_b instanceof BigNumber && poolpair.reserve_b_reserve_a instanceof BigNumber) {
        expect(poolpair.trade_enabled).toBe(true)
      } else {
        expect(poolpair.reserve_a_reserve_b).toBe('0')
        expect(poolpair.reserve_b_reserve_a).toBe('0')
        expect(poolpair.trade_enabled).toBe(false)
      }

      expect(poolpair.block_commission_a instanceof BigNumber).toBe(true)
      expect(poolpair.block_commission_b instanceof BigNumber).toBe(true)
      expect(poolpair.reward_pct instanceof BigNumber).toBe(true)
      expect(typeof poolpair.creation_tx).toBe('string')
      expect(poolpair.creation_height instanceof BigNumber).toBe(true)
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

    expect(Object.keys(poolpairs).length).toBe(0)
  })

  it('should listPoolPairs with pagination limit', async () => {
    const filter = new PoolPairsFilter()
    filter.pagination = {
      start: 0,
      including_start: true,
      limit: 2
    }
    const poolpairs = await controller.list(filter)

    expect(Object.keys(poolpairs).length).toBe(2)
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

    for (const k in poolpairs) {
      const poolpair = poolpairs[k] as PoolPairInfoDto

      expect(typeof poolpair.symbol).toBe('string')
      expect(typeof poolpair.name).toBe('string')
      expect(typeof poolpair.status).toBe('boolean')
      expect(typeof poolpair.id_token_a).toBe('string')
      expect(typeof poolpair.id_token_b).toBe('string')
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
    expect(typeof data.id_token_a).toBe('string')
    expect(typeof data.id_token_b).toBe('string')
    expect(data.reserve_a instanceof BigNumber).toBe(true)
    expect(data.reserve_b instanceof BigNumber).toBe(true)
    expect(typeof data.reserve_a_reserve_b).toBe('string')
    expect(typeof data.reserve_b_reserve_a).toBe('string')
    expect(data.trade_enabled).toBe(false)
    expect(data.block_commission_a instanceof BigNumber).toBe(true)
    expect(data.block_commission_b instanceof BigNumber).toBe(true)
    expect(data.reward_pct instanceof BigNumber).toBe(true)
    expect(typeof data.creation_tx).toBe('string')
    expect(data.creation_height instanceof BigNumber).toBe(true)
  })

  it('should getPoolPair with verbose false', async () => {
    const filter = new PoolPairsFilter()
    filter.verbose = false

    const data = await controller.get('DFI-DBCH', filter)
    expect(data.symbol).toBe('DFI-DBCH')
    expect(data.name).toBe('Default Defi token-DBCH')
    expect(data.status).toBe(true)
    expect(typeof data.id_token_a).toBe('string')
    expect(typeof data.id_token_b).toBe('string')
  })

  it('should throw BadRequestException due to getting non-existent pair', async () => {
    await expect(controller.get('DFI-NONEXIST')).rejects.toThrow(BadRequestException)
  })
})
