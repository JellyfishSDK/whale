import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'

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

  await setup()
})

let oracleId: string
let height: number

async function setup (): Promise<void> {
  const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
  oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

  await container.generate(1)

  await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

  await container.generate(1)

  height = await container.call('getblockcount')
}

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

it('should getStatus 5 blocks after the oracle was updated', async () => {
  await service.waitForIndexedHeight(height + 5)

  const result = await client.oracle.getStatus(oracleId)
  expect(result.data.weightage).toStrictEqual(2)
  expect(result.state).toStrictEqual('LIVE')
})
