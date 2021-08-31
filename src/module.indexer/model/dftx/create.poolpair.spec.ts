import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createPoolPair, createToken, mintTokens } from '@defichain/testing'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(101) // token creation fee

  const tokens = ['USDT', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }

  for (const token of tokens) {
    await createPoolPair(container, token, 'DFI')
  }

  await container.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('create poolpair', () => {
  it('should index poolpairs', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(6)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolpairId}`)
    }))

    expect(poolPairs[1]).toStrictEqual({
      id: '1',
      symbol: 'DBTC',
      name: 'DBTC',
      decimal: 8,
      limit: '0.00000000',
      sort: '00000001',
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      block: expect.any(Object)
    })

    expect(poolPairs[0]).toStrictEqual({
      id: '128',
      symbol: 'MT',
      name: 'MYTOKEN',
      decimal: 8,
      limit: '0.00000000',
      sort: '00000080',
      mintable: true,
      tradeable: true,
      isDAT: false,
      isLPS: false,
      block: expect.any(Object)
    })
  })
})
