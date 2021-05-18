import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TokensController } from '@src/module.api/tokens.controller'
import { createToken } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: TokensController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
  await createToken(container, 'DSWAP')
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

describe('controller.get() for all tokens', () => {
  it('should listTokens', async () => {
    const result = await controller.get({ size: 100 })
    result.data.forEach(function (data) {
      switch (data.symbol) {
        case 'DFI':
          expect(data.symbol).toBe('DFI')
          expect(data.symbolKey).toBe('DFI')
          expect(data.name).toBe('Default Defi token')
          expect(data.decimal).toBe(8)
          expect(data.limit).toBe(0)
          expect(data.mintable).toBe(false)
          expect(data.tradeable).toBe(true)
          expect(data.isDAT).toBe(true)
          expect(data.isLPS).toBe(false)
          expect(data.finalized).toBe(true)
          expect(data.minted).toBe(0)
          expect(data.creationTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.creationHeight).toBe(0)
          expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.destructionHeight).toBe(-1)
          expect(data.collateralAddress).toBe('')
          break
        case 'DSWAP':
          expect(data.symbol).toBe('DSWAP')
          expect(data.symbolKey).toBe('DSWAP')
          expect(data.name).toBe('DSWAP')
          expect(data.decimal).toBe(8)
          expect(data.limit).toBe(0)
          expect(data.mintable).toBe(true)
          expect(data.tradeable).toBe(true)
          expect(data.isDAT).toBe(true)
          expect(data.isLPS).toBe(false)
          expect(data.finalized).toBe(false)
          expect(data.minted).toBe(0)
          expect(typeof data.creationTx).toBe('string')
          expect(data.creationHeight).toBeGreaterThan(0)
          expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
          expect(data.destructionHeight).toBe(-1)
          expect(typeof data.collateralAddress).toBe('string')
          break
      }
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.get({ size: 1 })
    expect(first.data.length).toBe(1)
    expect(first.page?.next).toBe('0')

    const second = await controller.get({
      size: 1,
      next: first.page?.next
    })

    expect(second.data.length).toBe(1)
    expect(second.page?.next).toBe('1')

    const third = await controller.get({
      size: 1,
      next: second.page?.next
    })

    expect(third.data.length).toBe(0)
    expect(third.page).toBeUndefined()
  })

  it('should listTokens with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.get({ size: 100, next: '300' })
    expect(result.data.length).toBe(0)
    expect(result.page).toBeUndefined()
  })
})

describe('controller.getId() for DFI', () => {
  it('should return DFI with id as param', async () => {
    const data = await controller.getId('0')

    expect(data.symbol).toBe('DFI')
    expect(data.symbolKey).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(false)
    expect(data.tradeable).toBe(true)
    expect(data.isDAT).toBe(true)
    expect(data.isLPS).toBe(false)
    expect(data.finalized).toBe(true)
    expect(data.minted).toBe(0)
    expect(data.creationTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creationHeight).toBe(0)
    expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destructionHeight).toBe(-1)
    expect(data.collateralAddress).toBe('')
  })

  it('should return DFI with symbol as param', async () => {
    const data = await controller.getId('DFI')

    expect(data.symbol).toBe('DFI')
    expect(data.symbolKey).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
  })

  it('should return DFI with creationTx as param', async () => {
    const data = await controller.getId('0000000000000000000000000000000000000000000000000000000000000000')

    expect(data.symbol).toBe('DFI')
    expect(data.symbolKey).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
  })
})

describe('controller.getId() for newly created token', () => {
  it('should return DSWAP token with id as param', async () => {
    const data = await controller.getId('1')

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbolKey).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(true)
    expect(data.tradeable).toBe(true)
    expect(data.isDAT).toBe(true)
    expect(data.isLPS).toBe(false)
    expect(data.finalized).toBe(false)
    expect(data.minted).toBe(0)
    expect(typeof data.creationTx).toBe('string')
    expect(data.creationHeight).toBeGreaterThan(0)
    expect(data.destructionTx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destructionHeight).toBe(-1)
    expect(typeof data.collateralAddress).toBe('string')
  })

  it('should return DSWAP token with symbol as param', async () => {
    const data = await controller.getId('DSWAP')

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbolKey).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
  })

  it('should return DSWAP token with creationTx as param', async () => {
    let data = await controller.getId('1')
    data = await controller.getId(data.creationTx)

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbolKey).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
  })
})

describe('controller.getId() for token which does not exist', () => {
  it('should fail with id as param', async () => {
    await expect(controller.getId('2'))
      .rejects
      .toThrow('Token not found')
  })

  it('should fail with symbol as param', async () => {
    await expect(controller.getId('MOCK'))
      .rejects
      .toThrow('Token not found')
  })

  it('should fail with creationTx as param', async () => {
    await expect(controller.getId('5000000000000000000000000000000000000000000000000000000000000000'))
      .rejects
      .toThrow('Token not found')
  })
})
