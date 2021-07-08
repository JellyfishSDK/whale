import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { TokenMapper } from '@src/module.model/token'
import crypto from 'crypto'

let database: Database
let mapper: TokenMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [TokenMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<TokenMapper>(TokenMapper)

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
      hash: crypto.randomBytes(32).toString('hex'),
      height: Number(id)
    },
    symbol: symbol,
    name: symbol,
    decimal: 8,
    limit: '0',
    mintable: true,
    tradeable: true,
    isDAT: true
  })
}

async function setup (): Promise<void> {
  await put('1', 'APE')
  await put('2', 'BEE')
  await put('3', 'CAT')
  await put('4', 'DOG')
  await put('5', 'ELF')
  await put('6', 'FOX')
}

describe('getLatest', () => {
  it('should getLatest', async () => {
    const token = await mapper.getLatest()
    if (token === undefined) throw new Error()

    expect(token.id).toStrictEqual('6')
    expect(token.block.hash).toStrictEqual(expect.any(String))
    expect(token.block.height).toStrictEqual(6)
    expect(token.symbol).toStrictEqual('FOX')
    expect(token.decimal).toStrictEqual(8)
    expect(token.limit).toStrictEqual('0')
    expect(token.mintable).toStrictEqual(true)
    expect(token.tradeable).toStrictEqual(true)
    expect(token.isDAT).toStrictEqual(true)
  })
})

describe('query', () => {
  it('should query', async () => {
    const tokens = await mapper.query(100)
    expect(tokens.length).toStrictEqual(6)

    expect(tokens[1].id).toStrictEqual('5')
    expect(tokens[1].block.hash).toStrictEqual(expect.any(String))
    expect(tokens[1].block.height).toStrictEqual(5)
    expect(tokens[1].symbol).toStrictEqual('ELF')
    expect(tokens[1].decimal).toStrictEqual(8)
    expect(tokens[1].limit).toStrictEqual('0')
    expect(tokens[1].mintable).toStrictEqual(true)
    expect(tokens[1].tradeable).toStrictEqual(true)
    expect(tokens[1].isDAT).toStrictEqual(true)
  })

  it('should query with limit', async () => {
    const tokens = await mapper.query(1)
    expect(tokens.length).toStrictEqual(1)
  })
})

describe('get', () => {
  it('should get', async () => {
    const token = await mapper.get('3')
    if (token === undefined) throw new Error()

    expect(token.id).toStrictEqual('3')
    expect(token.block.hash).toStrictEqual(expect.any(String))
    expect(token.block.height).toStrictEqual(3)
    expect(token.symbol).toStrictEqual('CAT')
    expect(token.decimal).toStrictEqual(8)
    expect(token.limit).toStrictEqual('0')
    expect(token.mintable).toStrictEqual(true)
    expect(token.tradeable).toStrictEqual(true)
    expect(token.isDAT).toStrictEqual(true)
  })

  it('should get undefined as getting non-existence data', async () => {
    const token = await mapper.get('LEO')
    expect(token).toBeUndefined()
  })
})

describe('put', () => {
  it('should put', async () => {
    const tokenBefore = await mapper.get('11')
    expect(tokenBefore).toBeUndefined()

    await mapper.put({
      id: '11',
      block: {
        hash: crypto.randomBytes(32).toString('hex'),
        height: 11
      },
      symbol: 'NEO',
      name: 'NEO',
      decimal: 8,
      limit: '0',
      mintable: true,
      tradeable: true,
      isDAT: true
    })

    const tokenAfter = await mapper.get('11')
    if (tokenAfter === undefined) throw new Error()
    expect(tokenAfter.id).toStrictEqual('11')
    expect(tokenAfter.block.hash).toStrictEqual(expect.any(String))
    expect(tokenAfter.block.height).toStrictEqual(11)
    expect(tokenAfter.symbol).toStrictEqual('NEO')
    expect(tokenAfter.decimal).toStrictEqual(8)
    expect(tokenAfter.limit).toStrictEqual('0')
    expect(tokenAfter.mintable).toStrictEqual(true)
    expect(tokenAfter.tradeable).toStrictEqual(true)
    expect(tokenAfter.isDAT).toStrictEqual(true)
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await put('77', 'BAT')

    const tokenBefore = await mapper.get('77')
    if (tokenBefore === undefined) throw new Error()
    expect(tokenBefore.id).toStrictEqual('77')

    await mapper.delete('77')

    const tokenAfter = await mapper.get('77')
    expect(tokenAfter).toBeUndefined()
  })
})
