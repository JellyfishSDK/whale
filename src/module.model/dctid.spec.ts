import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { DctIdMapper } from '@src/module.model/dctid'

let database: Database
let mapper: DctIdMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [DctIdMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<DctIdMapper>(DctIdMapper)
})

afterAll(async () => {
  await (database as LevelDatabase).close()
})

afterEach(async () => {
  await (database as LevelDatabase).clear()
})

describe('getLatest', () => {
  it('should getLatest', async () => {
    await mapper.put({ id: '0' })

    const dctId = await mapper.getLatest()
    if (dctId === undefined) throw new Error()

    expect(dctId.id).toStrictEqual('0')
  })
})

describe('put', () => {
  it('should put', async () => {
    await mapper.put({ id: '0' })

    const dctIdBefore = await mapper.getLatest()
    if (dctIdBefore === undefined) throw new Error()
    expect(dctIdBefore.id).toStrictEqual('0')

    await mapper.put({ id: '1' })

    const dctIdAfter = await mapper.getLatest()
    if (dctIdAfter === undefined) throw new Error()
    expect(dctIdAfter.id).toStrictEqual('1')
  })
})

describe('delete', () => {
  it('should delete', async () => {
    await mapper.put({ id: '1' })

    const dctIdBefore = await mapper.getLatest()
    if (dctIdBefore === undefined) throw new Error()
    expect(dctIdBefore.id).toStrictEqual('1')

    await mapper.delete('1')

    const dctIdAfter = await mapper.getLatest()
    expect(dctIdAfter).toBeUndefined()
  })
})
