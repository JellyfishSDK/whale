import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { createPoolPair, createToken } from '@defichain/testing'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()
  await createToken(container, 'DBTC')
  await createToken(container, 'DETH')
  await createPoolPair(container, 'DBTC', 'DETH')
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('stats', () => {
  it('should get', async () => {
    const data = await client.stats.get()
    // TODO(fuxingloh):
  })
})
