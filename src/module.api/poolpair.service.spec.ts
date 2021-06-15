import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { CacheModule } from '@nestjs/common'

const container = new MasterNodeRegTestContainer()
let poolPairService: PoolPairService

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      PoolPairInfoCache,
      PoolPairService
    ]
  }).compile()

  poolPairService = app.get(PoolPairService)

  const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }
  await createPoolPair(container, 'A', 'B')
  await createPoolPair(container, 'A', 'C')
  await createPoolPair(container, 'A', 'D')
  await createPoolPair(container, 'A', 'E')
  await createPoolPair(container, 'A', 'F')
  await createPoolPair(container, 'B', 'C')
  await createPoolPair(container, 'B', 'D')
  await createPoolPair(container, 'B', 'E')
  await container.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 100,
    tokenB: 'B',
    amountB: 200,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 50,
    tokenB: 'C',
    amountB: 300,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 90,
    tokenB: 'D',
    amountB: 360,
    shareAddress: await getNewAddress(container)
  })
})

afterAll(async () => {
  await container.stop()
})

describe('list', () => {
  it('should list', async () => {
    await poolPairService.list({
      size: 30
    })
  })

  it.only('should list with pagination', async () => {
    await poolPairService.list({
      size: 2
    })

    // console.log('first: ', first)
    // expect(first.data.length).toStrictEqual(2)
    // expect(first.page?.next).toStrictEqual('8')
    // expect(first.data[0].symbol).toStrictEqual('A-B')
    // expect(first.data[1].symbol).toStrictEqual('A-C')

    // const next = await controller.list({
    //   size: 10,
    //   next: first.page?.next
    // })

    // expect(next.data.length).toStrictEqual(6)
    // expect(next.page?.next).toBeUndefined()
    // expect(next.data[0].symbol).toStrictEqual('A-D')
    // expect(next.data[1].symbol).toStrictEqual('A-E')
    // expect(next.data[2].symbol).toStrictEqual('A-F')
    // expect(next.data[3].symbol).toStrictEqual('B-C')
    // expect(next.data[4].symbol).toStrictEqual('B-D')
    // expect(next.data[5].symbol).toStrictEqual('B-E')
  })

  // it('should list with undefined next pagination', async () => {
  //   const first = await controller.list({
  //     size: 2,
  //     next: undefined
  //   })

  //   expect(first.data.length).toStrictEqual(2)
  //   expect(first.page?.next).toStrictEqual('8')
  // })
})
