import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { PoolPairMapper } from '@src/module.model/poolpair'
import BigNumber from 'bignumber.js'

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

async function put (id: string, symbol: string): Promise<void> {
  await mapper.put({
    id: id,
    block: {
      hash: '',
      height: Number(id)
    },
    symbol: symbol,
    status: true,
    commission: new BigNumber('0.001'),
    tokenA: '0',
    tokenB: '1'
  })
}

async function setup (): Promise<void> {
  await put('1', 'BTC-DFI')
  await put('2', 'ETH-DFI')
  await put('3', 'USDT-DFI')
  await put('4', 'DAI-DFI')
}

describe('getLatest', () => {
  it('should getLatest', async () => {
    const poolpair = await mapper.getLatest()
    if (poolpair === undefined) throw new Error()

    expect(poolpair.id).toStrictEqual('4')
    expect(poolpair.block.hash).toStrictEqual('')
    expect(poolpair.block.height).toStrictEqual(4)
    expect(poolpair.symbol).toStrictEqual('DAI-DFI')
    expect(poolpair.status).toStrictEqual(true)
    expect(poolpair.tokenA).toStrictEqual('0')
    expect(poolpair.tokenB).toStrictEqual('1')
  })
})

describe('query', () => {
  it('should query', async () => {
    const poolpairs = await mapper.query(100)
    expect(poolpairs.length).toStrictEqual(4)

    expect(poolpairs[2].id).toStrictEqual('2')
    expect(poolpairs[2].block.hash).toStrictEqual('')
    expect(poolpairs[2].block.height).toStrictEqual(2)
    expect(poolpairs[2].symbol).toStrictEqual('ETH-DFI')
    expect(poolpairs[2].status).toStrictEqual(true)
    expect(poolpairs[2].tokenA).toStrictEqual('0')
    expect(poolpairs[2].tokenB).toStrictEqual('1')
  })

  it('should query with limit', async () => {
    const poolpairs = await mapper.query(1)
    expect(poolpairs.length).toStrictEqual(1)
  })
})

describe('get', () => {
  it('should get', async () => {
    const poolpair = await mapper.get('3')
    if (poolpair === undefined) throw new Error()

    expect(poolpair.id).toStrictEqual('3')
    expect(poolpair.block.hash).toStrictEqual('')
    expect(poolpair.block.height).toStrictEqual(3)
    expect(poolpair.symbol).toStrictEqual('USDT-DFI')
    expect(poolpair.status).toStrictEqual(true)
    expect(poolpair.tokenA).toStrictEqual('0')
    expect(poolpair.tokenB).toStrictEqual('1')
  })

  it('should get undefined as getting non-existence data', async () => {
    const poolpair = await mapper.get('HUH-DFI')
    expect(poolpair).toBeUndefined()
  })
})

describe('put', () => {
  it('should put', async () => {
    const poolpairBefore = await mapper.get('11')
    expect(poolpairBefore).toBeUndefined()

    await mapper.put({
      id: '11',
      block: {
        hash: '',
        height: 11
      },
      symbol: 'XRP-DFI',
      status: true,
      commission: new BigNumber('0.001'),
      tokenA: '0',
      tokenB: '1'
    })

    const poolpairAfter = await mapper.get('11')
    if (poolpairAfter === undefined) throw new Error()
    expect(poolpairAfter.id).toStrictEqual('11')
    expect(poolpairAfter.block.hash).toStrictEqual('')
    expect(poolpairAfter.block.height).toStrictEqual(11)
    expect(poolpairAfter.symbol).toStrictEqual('XRP-DFI')
    expect(poolpairAfter.status).toStrictEqual(true)
    expect(poolpairAfter.tokenA).toStrictEqual('0')
    expect(poolpairAfter.tokenB).toStrictEqual('1')
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await put('77', 'COMP-DFI')

    const poolpairBefore = await mapper.get('77')
    if (poolpairBefore === undefined) throw new Error()
    expect(poolpairBefore.id).toStrictEqual('77')

    await mapper.delete('77')

    const poolpairAfter = await mapper.get('77')
    expect(poolpairAfter).toBeUndefined()
  })
})
