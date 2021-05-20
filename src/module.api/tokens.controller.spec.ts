import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokensController } from '@src/module.api/tokens.controller'
import { createToken, createPoolPair } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: TokensController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
  await createToken(container, 'DBTC')
  await createToken(container, 'DETH')
  await createPoolPair(container, 'DBTC', 'DETH')
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    controllers: [TokensController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()
  controller = app.get<TokensController>(TokensController)
})

describe('controller.list() for all tokens', () => {
  it('should listTokens', async () => {
    const result = await controller.list({ size: 100 })
    expect(result.data.length).toBe(4)

    let data = result.data[0]

    expect(data).toEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: true,
      minted: 0,
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: ''
    })

    data = result.data[1]

    expect(data).toEqual({
      id: '1',
      symbol: 'DBTC',
      symbolKey: 'DBTC',
      name: 'DBTC',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })

    data = result.data[2]

    expect(data).toEqual({
      id: '2',
      symbol: 'DETH',
      symbolKey: 'DETH',
      name: 'DETH',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })

    data = result.data[3]

    expect(data).toEqual({
      id: '3',
      symbol: 'DBTC-DET',
      symbolKey: 'DBTC-DET',
      name: 'DBTC-DETH',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: true,
      finalized: true,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.list({ size: 1 })

    expect(first.data.length).toBe(1)
    expect(first.page?.next).toBe('0')

    const second = await controller.list({
      size: 1,
      next: first.page?.next
    })

    expect(second.data.length).toBe(1)
    expect(second.page?.next).toBe('1')

    const third = await controller.list({
      size: 1,
      next: second.page?.next
    })

    expect(third.data.length).toBe(1)
    expect(third.page?.next).toBe('2')

    const forth = await controller.list({
      size: 1,
      next: third.page?.next
    })

    expect(forth.data.length).toBe(1)
    expect(forth.page?.next).toBe('3')

    const fifth = await controller.list({
      size: 1,
      next: forth.page?.next
    })

    expect(fifth.data.length).toBe(0)
    expect(fifth.page).toBeUndefined()
  })

  it('should listTokens with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.list({ size: 100, next: '300' })

    expect(result.data.length).toBe(0)
    expect(result.page).toBeUndefined()
  })
})

describe('controller.get()', () => {
  it('should return DFI coin with id as param', async () => {
    const data = await controller.get('0')
    expect(data).toEqual({
      id: '0',
      symbol: 'DFI',
      symbolKey: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: true,
      minted: 0,
      creation: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: 0
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: ''
    })
  })

  it('should return DBTC token with id as param', async () => {
    const data = await controller.get('1')
    expect(data).toEqual({
      id: '1',
      symbol: 'DBTC',
      symbolKey: 'DBTC',
      name: 'DBTC',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should return DETH token with id as param', async () => {
    const data = await controller.get('2')
    expect(data).toEqual({
      id: '2',
      symbol: 'DETH',
      symbolKey: 'DETH',
      name: 'DETH',
      decimal: 8,
      limit: 0,
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      finalized: false,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })

  it('should return DBTC-DETH LP token with id as param', async () => {
    const data = await controller.get('3')
    expect(data).toEqual({
      id: '3',
      symbol: 'DBTC-DET',
      symbolKey: 'DBTC-DET',
      name: 'DBTC-DETH',
      decimal: 8,
      limit: 0,
      mintable: false,
      tradeable: true,
      isDAT: true,
      isLPS: true,
      finalized: true,
      minted: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      destruction: {
        tx: '0000000000000000000000000000000000000000000000000000000000000000',
        height: -1
      },
      collateralAddress: expect.any(String)
    })
  })
})

describe('controller.get() for token which is not found', () => {
  it('should fail with id as param', async () => {
    await expect(controller.get('4'))
      .rejects
      .toThrow('Token not found')
  })
})
