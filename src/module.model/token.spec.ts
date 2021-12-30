import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { TokenMapper } from '@src/module.model/token'
import { HexEncoder } from './_hex.encoder'

let database: Database
let mapper: TokenMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [TokenMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<TokenMapper>(TokenMapper)
})

async function put (id: number, symbol: string): Promise<void> {
  await mapper.put({
    id: `${id}`,
    sort: HexEncoder.encodeHeight(id),
    symbol: symbol,
    name: symbol,
    isDAT: true,
    isLPS: false,
    limit: '8',
    mintable: true,
    decimal: 8,
    tradeable: true,
    block: {
      hash: 'hash',
      height: 0,
      medianTime: 0,
      time: 0
    }
  })
}
beforeEach(async () => {
})

afterEach(async () => {
  await (database as LevelDatabase).clear()
})

it('test put concurrency', async () => {
  { // test put diff token
    // console.log('before put CAT')
    await put(1, 'CAT')
    // console.log('after put CAT')
    await put(2, 'DOG')
    // console.log('before sleep')
    // await new Promise((resolve) => setTimeout(resolve, 1000))
    // console.log('after sleep')

    const cat = await mapper.get('1')
    expect(cat?.symbol).toStrictEqual('CAT')
    const dog = await mapper.get('2')
    expect(dog?.symbol).toStrictEqual('DOG')

    const list = await mapper.query(30)
    expect(list.length).toStrictEqual(2)
    const symbols = list.map(each => each.symbol)
    expect(symbols).toStrictEqual(['DOG', 'CAT'])
  }

  { // test put diff token concurrently
    const promises = []
    promises.push(put(3, 'OWL'))
    promises.push(put(4, 'FOX'))
    await Promise.all(promises)

    const list = await mapper.query(30)
    expect(list.length).toStrictEqual(4)
  }

  { // test put same token concurrently
    const promises = []
    promises.push(put(5, 'APE'))
    promises.push(put(5, 'APE'))
    await Promise.all(promises)

    const list = await mapper.query(30)
    expect(list.length).toStrictEqual(5)
  }
})
