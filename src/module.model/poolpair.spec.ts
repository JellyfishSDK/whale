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

  // build once for query manipulation
  await setup()
})

afterAll(async () => {
  await (database as LevelDatabase).close()
})

async function put (
  poolId: string, symbol: string, symbolId: string, height: number
): Promise<void> {
  await mapper.put({
    id: `${symbolId}-${height}`,
    symbolId: symbolId,
    poolId: poolId,
    block: {
      hash: '',
      height: height
    },
    symbol: symbol,
    status: true,
    commission: '0.001'
  })
}

async function setup (): Promise<void> {
  await put('5', 'BTC-DFI', '1-0', 5)
  await put('6', 'ETH-DFI', '2-0', 6)
  await put('7', 'USDT-DFI', '3-0', 7)
  await put('8', 'DAI-DFI', '4-0', 8)
  await put('8', 'DAI-DFI', '4-0', 9)
  await put('8', 'DAI-DFI', '4-0', 10)
}

describe('getLatest', () => {
  it('should getLatest', async () => {
    const poolpair = await mapper.getLatest('4-0')
    if (poolpair === undefined) throw new Error()

    expect(poolpair.id).toStrictEqual('4-0-10')
    expect(poolpair.symbolId).toStrictEqual('4-0')
    expect(poolpair.poolId).toStrictEqual('8')
    expect(poolpair.block.hash).toStrictEqual('')
    expect(poolpair.block.height).toStrictEqual(10)
    expect(poolpair.symbol).toStrictEqual('DAI-DFI')
    expect(poolpair.status).toStrictEqual(true)
  })
})

describe('query', () => {
  it('should query', async () => {
    const poolpairs = await mapper.query('4-0', 100)
    expect(poolpairs.length).toStrictEqual(3)

    expect(poolpairs[2].id).toStrictEqual('4-0-8')
    expect(poolpairs[2].poolId).toStrictEqual('8')
    expect(poolpairs[2].block.hash).toStrictEqual('')
    expect(poolpairs[2].block.height).toStrictEqual(8)
    expect(poolpairs[2].symbol).toStrictEqual('DAI-DFI')
    expect(poolpairs[2].status).toStrictEqual(true)
    expect(poolpairs[2].commission).toStrictEqual('0.001')

    expect(poolpairs[1].block.height).toStrictEqual(9)
    expect(poolpairs[0].block.height).toStrictEqual(10)
  })

  it('should query with limit', async () => {
    const poolpairs = await mapper.query('4-0', 1)
    expect(poolpairs.length).toStrictEqual(1)
  })
})

describe('get', () => {
  it('should get', async () => {
    const poolpair = await mapper.get('3-0-7')
    if (poolpair === undefined) throw new Error()

    expect(poolpair.id).toStrictEqual('3-0-7')
    expect(poolpair.poolId).toStrictEqual('7')
    expect(poolpair.block.hash).toStrictEqual('')
    expect(poolpair.block.height).toStrictEqual(7)
    expect(poolpair.symbol).toStrictEqual('USDT-DFI')
    expect(poolpair.status).toStrictEqual(true)
  })

  it('should get undefined as getting non-existence data', async () => {
    const poolpair = await mapper.get('99-0')
    expect(poolpair).toBeUndefined()
  })
})

describe('put', () => {
  it('should put', async () => {
    const poolpairBefore = await mapper.get('11-0')
    expect(poolpairBefore).toBeUndefined()

    await mapper.put({
      id: '11-0-11',
      symbolId: '11-0',
      poolId: '11',
      block: {
        hash: '',
        height: 11
      },
      symbol: 'XRP-DFI',
      status: true,
      commission: '0.001'
    })

    const poolpairAfter = await mapper.get('11-0-11')
    if (poolpairAfter === undefined) throw new Error()
    expect(poolpairAfter.id).toStrictEqual('11-0-11')
    expect(poolpairAfter.poolId).toStrictEqual('11')
    expect(poolpairAfter.block.hash).toStrictEqual('')
    expect(poolpairAfter.block.height).toStrictEqual(11)
    expect(poolpairAfter.symbol).toStrictEqual('XRP-DFI')
    expect(poolpairAfter.status).toStrictEqual(true)
    expect(poolpairAfter.commission).toStrictEqual('0.001')
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await put('78', 'COMP-DFI', '78-0', 78)

    const poolpairBefore = await mapper.get('78-0-78')
    if (poolpairBefore === undefined) throw new Error()
    expect(poolpairBefore.id).toStrictEqual('78-0-78')

    await mapper.delete('78-0-78')

    const poolpairAfter = await mapper.get('78-0-78')
    expect(poolpairAfter).toBeUndefined()
  })
})
