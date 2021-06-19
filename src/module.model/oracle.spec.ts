import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { OracleMapper } from '@src/module.model/oracle'
import assert from 'assert'

let database: Database
let mapper: OracleMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [OracleMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<OracleMapper>(OracleMapper)
})

afterAll(async () => {
  await (database as LevelDatabase).close()
})

beforeEach(async () => {
  async function put (id: string, status: number): Promise<void> {
    await mapper.put({
      id,
      status
    })
  }

  await put('0000000000000000000000000000000000000000000000000000000000000000', 0)
  await put('1000000000000000000000000000000000000000000000000000000000000000', 1)
  await put('1000000000000000000000000000000010000000000000000000000000000000', 2)
})

afterEach(async () => {
  await (database as LevelDatabase).clear()
})

it('should getById', async () => {
  const oracle = await mapper.getById('1000000000000000000000000000000000000000000000000000000000000000')
  expect(oracle?.id).toStrictEqual('1000000000000000000000000000000000000000000000000000000000000000')
})

it('should getByStatus', async () => {
  const oracles = await mapper.getByStatus(0)
  const oracle = (oracles != null) ? oracles[0] : null
  expect(oracle?.id).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
})

it('should put', async () => {
  const oracles = await mapper.getByStatus(0)
  const oracle = (oracles != null) ? oracles[0] : null
  assert(oracle !== undefined)

  if (oracle != null) {
    oracle.id = '0000000000000000000000000000000000000000000000000000000000000000'
    oracle.status = 0
    await mapper.put(oracle)

    const updateds = await mapper.getByStatus(0)
    const updated = (updateds != null) ? updateds[0] : null
    expect(updated?.id).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000000')
  }
})

it('should put but deleted', async () => {
  const oracles = await mapper.getByStatus(0)
  const oracle = (oracles != null) ? oracles[0] : null
  assert(oracle !== undefined)

  if (oracle != null) {
    oracle.status = 2
    await mapper.put(oracle)

    const deleted = await mapper.getByStatus(0)
    expect(deleted?.length).toStrictEqual(0)

    const updated = await mapper.getByStatus(2)
    expect(updated).toBeTruthy()
  }
})

it('should delete', async () => {
  await mapper.delete('0000000000000000000000000000000000000000000000000000000000000000')
  const deleted = await mapper.getByStatus(0)
  expect(deleted?.length).toStrictEqual(0)
})
