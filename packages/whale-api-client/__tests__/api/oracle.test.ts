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
let blockCount: number

async function setup (): Promise<void> {
  const priceFeeds = [{ token: 'APPL', currency: 'EUR' }]
  oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

  await container.generate(1)

  await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds, 2])

  await container.generate(1)

  blockCount = await container.call('getblockcount')
}

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

it('should getAggregation', async () => {
  await service.waitForIndexedHeight(blockCount)
  const agg = await client.oracle.getAggregation(oracleId)
  expect(agg.data.weightage).toStrictEqual(2)
  expect(agg.state).toStrictEqual('LIVE')
})
