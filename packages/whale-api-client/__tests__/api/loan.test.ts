import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
// import { WhaleApiClient } from '../../src'
// import { StubWhaleApiClient } from '../stub.client'
// import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

let container: MasterNodeRegTestContainer
let service: StubService
// let rpcClient: JsonRpcClient
// let apiClient: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})
