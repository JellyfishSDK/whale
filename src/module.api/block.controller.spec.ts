import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BlockController } from '@src/module.api/block.controller'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { CacheModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from '@src/module.database/_module'
import { ModelModule } from '@src/module.model/_module'
import { DeFiDModule } from '@src/module.defid/_module'
import { IndexerModule } from '@src/module.indexer/_module'
import { BlockMapper } from '@src/module.model/block'

const container = new MasterNodeRegTestContainer()
let controller: BlockController
let app: TestingModule
let mapper: BlockMapper

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const defidUrl = await container.getCachedRpcUrl()

  app = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ defid: { url: defidUrl } })]
      }),
      CacheModule.register(),
      ScheduleModule.forRoot(),
      DatabaseModule.forRoot('memory'),
      ModelModule,
      DeFiDModule,
      IndexerModule
    ],
    controllers: [BlockController],
    providers: [
      DeFiDCache
    ]
  }).compile()

  controller = app.get(BlockController)
  mapper = app.get<BlockMapper>(BlockMapper)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  async function put (height: number, hash: string): Promise<void> {
    await mapper.put({
      difficulty: 0,
      id: hash,
      hash: hash,
      height: height,
      masternode: '',
      medianTime: 0,
      merkleroot: '',
      minter: '',
      minterBlockCount: 0,
      previousHash: '',
      size: 0,
      sizeStripped: 0,
      stakeModifier: '',
      time: 0,
      transactionCount: 0,
      version: 0,
      weight: 0
    })
  }

  await put(0, '0000000000000000000000000000000000000000000000000000000000000000')
  await put(1, '1000000000000000000000000000000000000000000000000000000000000000')
  await put(2, '1000000000000000000000000000000010000000000000000000000000000000')
})

describe('getBlockTip', () => {
  it('should get latest block', async () => {
    const response = await controller.getBlockTip()

    expect(response?.id).toStrictEqual('1000000000000000000000000000000010000000000000000000000000000000')
    expect(response?.hash).toStrictEqual('1000000000000000000000000000000010000000000000000000000000000000')
  })

  it('should get block by hash', async () => {
    const response = await controller.getBlockByHash('1000000000000000000000000000000010000000000000000000000000000000')
    expect(response?.id).toStrictEqual('1000000000000000000000000000000010000000000000000000000000000000')

    expect(response?.hash).toStrictEqual('1000000000000000000000000000000010000000000000000000000000000000')
  })
})
