import { Test, TestingModule } from '@nestjs/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TokensController } from '@src/module.api/tokens.controller'
import { ConfigModule } from '@nestjs/config'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: TokensController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
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

describe('controller.get()', () => {
  it('should getToken', async () => {
    const result = await controller.get('DFI')
    expect(Object.keys(result).length).toBe(1)

    const data = result[0]

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
})
