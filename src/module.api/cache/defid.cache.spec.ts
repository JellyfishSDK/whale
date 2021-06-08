import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Test } from '@nestjs/testing'
import { CacheModule } from '@nestjs/common'
import { DeFiDCache, CachePrefix } from '@src/module.api/cache/defid.cache'
import { createToken, createPoolPair } from '@defichain/testing'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let cache: DeFiDCache

describe('getPoolPairInfo', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    const module = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        { provide: JsonRpcClient, useValue: client },
        DeFiDCache
      ]
    }).compile()

    cache = module.get(DeFiDCache)

    for (const token of ['A', 'B', 'C']) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
    }

    await createPoolPair(container, 'A', 'B') // 4
    await createPoolPair(container, 'A', 'C') // 5
    await createPoolPair(container, 'B', 'C') // 6

    // TODO(canonbrother): add listpoolpairs in @defi/testing
    const poolPairResult = await container.call('listpoolpairs')
    for (const k in poolPairResult) {
      await cache.getPoolPairInfo(k)
    }

    await container.stop()
  })

  it('should get from cache via get as container RPC is killed', async () => {
    const abKey = `${CachePrefix.POOL_PAIR_INFO} 4`
    const abPoolPair = await cache.testGet<PoolPairInfo>(abKey)
    expect(abPoolPair?.symbol).toStrictEqual('A-B')
    expect(abPoolPair?.name).toStrictEqual('A-B')

    const acKey = `${CachePrefix.POOL_PAIR_INFO} 5`
    const acPoolPair = await cache.testGet<PoolPairInfo>(acKey)
    expect(acPoolPair?.symbol).toStrictEqual('A-C')
    expect(acPoolPair?.name).toStrictEqual('A-C')

    const bcKey = `${CachePrefix.POOL_PAIR_INFO} 6`
    const bcPoolPair = await cache.testGet<PoolPairInfo>(bcKey)
    expect(bcPoolPair?.symbol).toStrictEqual('B-C')
    expect(bcPoolPair?.name).toStrictEqual('B-C')
  })
})

describe.only('batchTokenInfo', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    const module = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        { provide: JsonRpcClient, useValue: client },
        DeFiDCache
      ]
    }).compile()

    cache = module.get(DeFiDCache)

    for (const token of ['TOA', 'TOB', 'TOC']) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
    }

    await cache.batchTokenInfo(['0', '1', '2', '3']) // DFI, TOA, TOB, TOC

    await container.stop()
  })

  it('should get from cache via batch as container RPC is killed', async () => {
    const dfiKey = `${CachePrefix.TOKEN_INFO} 0`
    const dfi = await cache.testGet<TokenInfo>(dfiKey)
    expect(dfi?.symbol).toStrictEqual('DFI')
    expect(dfi?.name).toStrictEqual('Default Defi token')

    const tobKey = `${CachePrefix.TOKEN_INFO} 2`
    const tob = await cache.testGet<TokenInfo>(tobKey)
    expect(tob?.symbol).toStrictEqual('TOB')
    expect(tob?.name).toStrictEqual('TOB')
  })
})

describe('getTokenInfo', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    const module = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        { provide: JsonRpcClient, useValue: client },
        DeFiDCache
      ]
    }).compile()

    cache = module.get(DeFiDCache)

    for (const token of ['TOA', 'TOB', 'TOC']) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
    }

    await cache.getTokenInfo('0') // DFI
    await cache.getTokenInfo('1') // TOA
    await cache.getTokenInfo('2') // TOB
    await cache.getTokenInfo('3') // TOC

    await container.stop()
  })

  it('should get from cache via get as container RPC is killed', async () => {
    const dfiKey = `${CachePrefix.TOKEN_INFO} 0`
    const dfi = await cache.testGet<TokenInfo>(dfiKey)
    expect(dfi?.symbol).toStrictEqual('DFI')
    expect(dfi?.name).toStrictEqual('Default Defi token')

    const tobKey = `${CachePrefix.TOKEN_INFO} 2`
    const tob = await cache.testGet<TokenInfo>(tobKey)
    expect(tob?.symbol).toStrictEqual('TOB')
    expect(tob?.name).toStrictEqual('TOB')
  })
})
