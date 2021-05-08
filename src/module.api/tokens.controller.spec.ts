import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TokensController, TokensFilter } from '@src/module.api/tokens.controller'
import { ConfigModule } from '@nestjs/config'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: TokensController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      load: [() => ({ network: 'regtest' })]
    })],
    controllers: [TokensController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()

  controller = app.get<TokensController>(TokensController)
})

async function createToken (symbol: string): Promise<void> {
  const address = await container.call('getnewaddress')
  const metadata = {
    symbol,
    name: symbol,
    isDAT: true,
    mintable: true,
    tradeable: true,
    collateralAddress: address
  }
  await container.call('createtoken', [metadata])
  await container.generate(1)
}

describe('controller.get() for all coin and tokens', () => {
  beforeAll(async () => {
    await createToken('DSWAP')
  })

  it('should listTokens', async () => {
    const tokens = await controller.get()

    tokens.forEach(function (token) {
      expect(token.decimal).toBe(8)
      expect(token.limit).toBe(0)
      expect(token.minted).toBe(0)
      expect(token.is_lps).toBe(false)
      expect(typeof token.creation_tx).toBe('string')
      expect(typeof token.creation_height).toBe('number')
      expect(typeof token.destruction_tx).toBe('string')
      expect(typeof token.destruction_height).toBe('number')
      expect(typeof token.collateral_address).toBe('string')

      switch (token.symbol) {
        case 'DFI':
          expect(token.symbol).toBe('DFI')
          expect(token.symbol_key).toBe('DFI')
          expect(token.name).toBe('Default Defi token')
          expect(token.mintable).toBe(false)
          expect(token.tradeable).toBe(true)
          expect(token.is_dat).toBe(true)
          expect(token.finalized).toBe(true)
          expect(token.collateral_address).toBe('')
          break
        case 'DBTC':
          expect(token.symbol).toBe('DSWAP')
          expect(token.symbol_key).toBe('DSWAP')
          expect(token.name).toBe('DSWAP')
          expect(token.mintable).toBe(true)
          expect(token.tradeable).toBe(true)
          expect(token.is_dat).toBe(true)
          expect(token.finalized).toBe(false)
          break
      }
    })
  })

  it('should listTokens with start 300, limit 100 and return an empty object as out of range', async () => {
    const filter = new TokensFilter()
    filter.start = '300'
    filter.limit = '100'

    const tokens = await controller.get(filter)
    expect(Object.keys(tokens).length).toBe(0)
  })

  it('should listTokens with start 0 limit 2', async () => {
    const filter = new TokensFilter()
    filter.start = '0'
    filter.limit = '2'

    const tokens = await controller.get(filter)

    expect(Object.keys(tokens).length).toBe(2)
  })

  it('should listTokens with start 1', async () => {
    const filter = new TokensFilter()
    filter.start = '1'
    filter.limit = '2'

    const tokens = await controller.get(filter)
    expect(Object.keys(tokens).length).toBe(1)
  })
})

describe('controller.getId() for DFI', () => {
  it('should return DFI with id as param', async () => {
    const data = await controller.getId('0')

    expect(data.symbol).toBe('DFI')
    expect(data.symbol_key).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(false)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(true)
    expect(data.minted).toBe(0)
    expect(data.creation_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creation_height).toBe(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(data.collateral_address).toBe('')
  })

  it('should return DFI with symbol as param', async () => {
    const data = await controller.getId('DFI')

    expect(data.symbol).toBe('DFI')
    expect(data.symbol_key).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(false)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(true)
    expect(data.minted).toBe(0)
    expect(data.creation_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creation_height).toBe(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(data.collateral_address).toBe('')
  })

  it('should return DFI with creationTx as param', async () => {
    const data = await controller.getId('0000000000000000000000000000000000000000000000000000000000000000')

    expect(data.symbol).toBe('DFI')
    expect(data.symbol_key).toBe('DFI')
    expect(data.name).toBe('Default Defi token')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(false)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(true)
    expect(data.minted).toBe(0)
    expect(data.creation_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.creation_height).toBe(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(data.collateral_address).toBe('')
  })
})

describe('controller.getId() for newly created token', () => {
  it('should return DSWAP token with id as param', async () => {
    const data = await controller.getId('1')

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbol_key).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(true)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(false)
    expect(data.minted).toBe(0)
    expect(typeof data.creation_tx).toBe('string')
    expect(data.creation_height).toBeGreaterThan(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(typeof data.collateral_address).toBe('string')
  })

  it('should return DSWAP token with symbol as param', async () => {
    const data = await controller.getId('DSWAP')

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbol_key).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(true)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(false)
    expect(data.minted).toBe(0)
    expect(typeof data.creation_tx).toBe('string')
    expect(data.creation_height).toBeGreaterThan(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(typeof data.collateral_address).toBe('string')
  })

  it('should return DSWAP token with creationTx as param', async () => {
    let data = await controller.getId('1')
    data = await controller.getId(data.creation_tx)

    expect(data.symbol).toBe('DSWAP')
    expect(data.symbol_key).toBe('DSWAP')
    expect(data.name).toBe('DSWAP')
    expect(data.decimal).toBe(8)
    expect(data.limit).toBe(0)
    expect(data.mintable).toBe(true)
    expect(data.tradeable).toBe(true)
    expect(data.is_dat).toBe(true)
    expect(data.is_lps).toBe(false)
    expect(data.finalized).toBe(false)
    expect(data.minted).toBe(0)
    expect(typeof data.creation_tx).toBe('string')
    expect(data.creation_height).toBeGreaterThan(0)
    expect(data.destruction_tx).toBe('0000000000000000000000000000000000000000000000000000000000000000')
    expect(data.destruction_height).toBe(-1)
    expect(typeof data.collateral_address).toBe('string')
  })
})

describe('controller.getId() for token which does not exist', () => {
  it('should return Token not found with id as param', async () => {
    await expect(controller.getId('2'))
      .rejects
      .toThrow('Token not found')
  })

  it('should return Token not found with symbol as param', async () => {
    await expect(controller.getId('MOCK'))
      .rejects
      .toThrow('Token not found')
  })

  it('should return Token not found with creationTx as param', async () => {
    await expect(controller.getId('5000000000000000000000000000000000000000000000000000000000000000'))
      .rejects
      .toThrow('Token not found')
  })
})
