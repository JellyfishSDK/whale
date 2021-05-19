import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { AddressController } from '@src/module.api/address.controller'
import { createToken, mintTokens, sendTokensToAddress } from '@defichain/testing'
import { TokenInfoCache } from '@src/module.api/cache/token.info.cache'
import { CacheModule } from '@nestjs/common'
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "@src/module.database/module";
import { ModelModule } from "@src/module.model/_module";
import { DeFiDModule } from "@src/module.defid";
import { IndexerModule } from "@src/module.indexer/module";

const container = new MasterNodeRegTestContainer()
let address: string
let controller: AddressController

const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())
  address = await container.getNewAddress('', 'bech32')

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register(),
      ScheduleModule.forRoot(),
      DatabaseModule.forRoot('memory'),
      ModelModule,
      IndexerModule
    ],
    controllers: [AddressController],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      TokenInfoCache
    ]
  }).compile()

  controller = app.get(AddressController)
})

afterAll(async () => {
  await container.stop()
})

describe('tokens', () => {
  beforeAll(async () => {
    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token, { mintAmount: 1000 })
      await sendTokensToAddress(container, address, 10, token)
    }
  })

  it('should listTokens', async () => {
    const response = await controller.listTokens(address, {
      size: 30
    })

    expect(response.data.length).toBe(6)
    expect(response.page).toBeUndefined()

    expect(response.data[5]).toEqual({
      id: '6',
      amount: '10.00000000',
      symbol: 'F',
      symbolKey: 'F',
      name: 'F',
      isDAT: true,
      isLPS: false
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2
    })
    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('2')
    expect(first.data[0].symbol).toBe('A')
    expect(first.data[1].symbol).toBe('B')

    const next = await controller.listTokens(address, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toBe(4)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toBe('C')
    expect(next.data[1].symbol).toBe('D')
    expect(next.data[2].symbol).toBe('E')
    expect(next.data[3].symbol).toBe('F')
  })

  it('should listTokens with undefined next pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('2')
  })
})

describe('balance', () => {
  it('should getBalance should be zero', async () => {
    const balance = await controller.getBalance('regtest', address)
    console.log(balance)
  });

  // TODO(fuxingloh):
})
