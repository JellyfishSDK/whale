import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { PoolPairMapper } from '@src/module.model/poolpair'

let database: Database
let mapper: PoolPairMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [PoolPairMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<PoolPairMapper>(PoolPairMapper)

  // just need build once for query manipulation
  await setup()
})

afterAll(async () => {
  await (database as LevelDatabase).close()
})

async function put (id: string, symbol: string, tokenA: string, tokenB: string): Promise<void> {
  await mapper.put({
    id: `${tokenA}-${tokenB}`,
    poolId: id,
    block: {
      hash: '',
      height: Number(id)
    },
    symbol: symbol,
    status: true,
    commission: '0.001'
  })
}

async function setup (): Promise<void> {
  await put('5', 'BTC-DFI', '1', '0')
  await put('6', 'ETH-DFI', '2', '0')
  await put('7', 'USDT-DFI', '3', '0')
  await put('8', 'DAI-DFI', '4', '0')
}

describe('getLatest', () => {
  it('should getLatest', async () => {
    const poolpair = await mapper.getLatest()
    if (poolpair === undefined) throw new Error()

    expect(poolpair.id).toStrictEqual('4-0')
    expect(poolpair.poolId).toStrictEqual('8')
    expect(poolpair.block.hash).toStrictEqual('')
    expect(poolpair.block.height).toStrictEqual(8)
    expect(poolpair.symbol).toStrictEqual('DAI-DFI')
    expect(poolpair.status).toStrictEqual(true)
  })
})

describe('query', () => {
  it('should query', async () => {
    const poolpairs = await mapper.query(100)
    expect(poolpairs.length).toStrictEqual(4)

    expect(poolpairs[2].id).toStrictEqual('2-0')
    expect(poolpairs[2].poolId).toStrictEqual('6')
    expect(poolpairs[2].block.hash).toStrictEqual('')
    expect(poolpairs[2].block.height).toStrictEqual(6)
    expect(poolpairs[2].symbol).toStrictEqual('ETH-DFI')
    expect(poolpairs[2].status).toStrictEqual(true)
  })

  it('should query with limit', async () => {
    const poolpairs = await mapper.query(1)
    expect(poolpairs.length).toStrictEqual(1)
  })
})

describe('get', () => {
  it('should get', async () => {
    const poolpair = await mapper.get('3-0')
    if (poolpair === undefined) throw new Error()

    expect(poolpair.id).toStrictEqual('3-0')
    expect(poolpair.poolId).toStrictEqual('7')
    expect(poolpair.block.hash).toStrictEqual('')
    expect(poolpair.block.height).toStrictEqual(7)
    expect(poolpair.symbol).toStrictEqual('USDT-DFI')
    expect(poolpair.status).toStrictEqual(true)
  })

  it('should get undefined as getting non-existence data', async () => {
    const poolpair = await mapper.get('HUH-DFI')
    expect(poolpair).toBeUndefined()
  })
})

describe('put', () => {
  it('should put', async () => {
    const poolpairBefore = await mapper.get('11-0')
    expect(poolpairBefore).toBeUndefined()

    await mapper.put({
      id: '11-0',
      poolId: '12',
      block: {
        hash: '',
        height: 12
      },
      symbol: 'XRP-DFI',
      status: true,
      commission: '0.001'
    })

    const poolpairAfter = await mapper.get('11-0')
    if (poolpairAfter === undefined) throw new Error()
    expect(poolpairAfter.id).toStrictEqual('11-0')
    expect(poolpairAfter.poolId).toStrictEqual('12')
    expect(poolpairAfter.block.hash).toStrictEqual('')
    expect(poolpairAfter.block.height).toStrictEqual(12)
    expect(poolpairAfter.symbol).toStrictEqual('XRP-DFI')
    expect(poolpairAfter.status).toStrictEqual(true)
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await put('78', 'COMP-DFI', '77', '0')

    const poolpairBefore = await mapper.get('77-0')
    if (poolpairBefore === undefined) throw new Error()
    expect(poolpairBefore.id).toStrictEqual('77-0')

    await mapper.delete('77-0')

    const poolpairAfter = await mapper.get('77-0')
    expect(poolpairAfter).toBeUndefined()
  })
})
