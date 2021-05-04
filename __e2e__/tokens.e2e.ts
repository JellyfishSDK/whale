import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  app = await createTestingApp(container)
})

afterAll(async () => {
  await container.stop()
})

describe('GET: /v1/regtest/tokens/DFI', () => {
  it('should getToken', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/regtest/tokens/DFI'
    })

    expect(res.statusCode).toBe(200)
    const result = res.json().data
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
