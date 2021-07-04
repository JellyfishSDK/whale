import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasternodeController } from '@src/module.api/masternode.controller'
import { CacheModule } from '@nestjs/common'
import { DeFiDCache } from './cache/defid.cache'

const container = new MasterNodeRegTestContainer()
let controller: MasternodeController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    controllers: [MasternodeController],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      DeFiDCache
    ]
  }).compile()

  controller = app.get(MasternodeController)
})

afterAll(async () => {
  await container.stop()
})

describe('list', () => {
  it('should listMasternodes', async () => {
    const result = await controller.list({ size: 4 })
    expect(result.data.length).toStrictEqual(4)
    expect(Object.keys(result.data[0]).length).toStrictEqual(13)
  })

  it('should listMasternodes with pagination', async () => {
    const first = await controller.list({ size: 2 })
    expect(first.data.length).toStrictEqual(2)
  })
})
