import { Database } from '@src/module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { MasternodeOwnMapper } from '@src/module.model/masternode.own'

let database: Database
let mapper: MasternodeOwnMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [MasternodeOwnMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<MasternodeOwnMapper>(MasternodeOwnMapper)
})

beforeEach(async () => {
  async function put (
    masternodeId: string, ownerAddress: string, operatorAddress: string, height: number
  ): Promise<void> {
    await mapper.put({
      id: masternodeId,
      ownerAddress: ownerAddress,
      operatorAddress: operatorAddress,
      creationHeight: 0,
      resignHeight: 0,
      resignTx: undefined,
      mintedBlocks: 1,
      timelock: 0,
      local: true,
      block: { hash: '', height: height, time: 0, medianTime: 0 }
    })
  }

  await put('mnA1', 'mnA', 'mnAa', 1)
  await put('mnA2', 'mnA', 'mnAb', 2)
  await put('mnA3', 'mnA', 'mnAc', 3)

  await put('mnB1', 'mnB', 'mnBa', 20)
})

afterEach(async () => {
  await (database as LevelDatabase).clear()
})

it('should query', async () => {
  {
    const list = await mapper.query('mnA', 10)
    expect(list.length).toStrictEqual(3)

    expect(list[0].block.height).toStrictEqual(3)
    expect(list[0].id).toStrictEqual('mnA3')
    expect(list[0].operatorAddress).toStrictEqual('mnAc')

    expect(list[1].block.height).toStrictEqual(2)
    expect(list[1].id).toStrictEqual('mnA2')
    expect(list[1].operatorAddress).toStrictEqual('mnAb')

    expect(list[2].block.height).toStrictEqual(1)
    expect(list[2].id).toStrictEqual('mnA1')
    expect(list[2].operatorAddress).toStrictEqual('mnAa')
  }

  {
    const list = await mapper.query('mnB', 10)
    expect(list.length).toStrictEqual(1)
    expect(list[0].block.height).toStrictEqual(20)
    expect(list[0].id).toStrictEqual('mnB1')
    expect(list[0].operatorAddress).toStrictEqual('mnBa')
  }
})

it('should delete', async () => {
  const list = await mapper.query('mnA', 10)
  expect(list.length).toStrictEqual(3)

  await mapper.delete(list[1].id)
  const deleted = await mapper.query('mnA', 10)
  expect(deleted.length).toStrictEqual(2)
})
