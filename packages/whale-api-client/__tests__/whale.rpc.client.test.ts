import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { WhaleRpcClient } from '../src'
import { StubService } from './stub.service'
import { StubWhaleApiClient } from './stub.client'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleRpcClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new WhaleRpcClient(new StubWhaleApiClient(service))

  await container.start()
  await container.waitForReady()
  await service.start()
})

afterAll(async () => {
  await Promise.all([
    service.stop(),
    container.stop()
  ])
})

it('should not be able to access wallet', async () => {
  return expect(async () => {
    await client.wallet.getBalance()
  }).toThrow('WhaleRpcClient: wallet.getBalance not enabled in WhaleApiClient')
})

describe('whitelisted rpc methods', () => {
  it('should client.blockchain.getBlockchainInfo()', async () => {
    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toBe('regtest')
    expect(typeof info.blocks).toBe('number')
  })

  it('should client.blockchain.getBlockCount()', async () => {
    const count = await client.blockchain.getBlockCount()

    expect(typeof count).toBe('number')
  })

  it('should client.blockchain.getBlockHash(1)', async () => {
    await container.generate(1)

    const hash = await client.blockchain.getBlockHash(1)
    expect(hash.length).toBe(64)
  })

  it('should client.blockchain.getBlock(hash, 2)', async () => {
    await container.generate(1)

    const hash = await client.blockchain.getBlockHash(1)
    const block = await client.blockchain.getBlock(hash, 2)

    expect(block.hash.length).toBe(64)
    expect(Array.isArray(block.tx)).toBe(true)
  })
})
