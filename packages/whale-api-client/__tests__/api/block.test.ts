import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'

import waitForExpect from 'wait-for-expect'

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

  // ensure that there's at least 100 blocks
  await waitForExpect(async () => {
    const blocks = await client.block.list()
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[0].height).toBeGreaterThanOrEqual(100)
  }, 30000)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('get blocks', () => {
  beforeAll(async () => {
    await container.waitForWalletBalanceGTE(100)
  })

  it('should get paginated list of blocks', async () => {
    const first = await client.block.list(30)
    expect(first.length).toStrictEqual(30)

    expect(first[0]).toStrictEqual(
      expect.objectContaining({
        id: expect.stringMatching(/[0-f]{64}/),
        hash: expect.stringMatching(/[0-f]{64}/),
        previousHash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        version: expect.any(Number),
        time: expect.any(Number),
        medianTime: expect.any(Number),
        transactionCount: expect.any(Number),
        difficulty: expect.any(Number),
        masternode: expect.stringMatching(/[0-f]{64}/),
        minter: expect.stringMatching(/[a-zA-Z0-9]+/),
        minterBlockCount: expect.any(Number),
        stakeModifier: expect.stringMatching(/[0-f]{64}/),
        merkleroot: expect.stringMatching(/[0-f]{64}/),
        size: expect.any(Number),
        sizeStripped: expect.any(Number),
        weight: expect.any(Number)
      })
    )
    expect(first[0].height).toBeGreaterThanOrEqual(100)

    const second = await client.paginate(first)
    expect(second[0].height).toStrictEqual(first[29].height - 1)
    expect(second.length).toStrictEqual(30)
  })

  it('should get block through height', async () => {
    const block = await client.block.get('37')

    expect(block).toStrictEqual(
      expect.objectContaining({
        id: expect.stringMatching(/[0-f]{64}/),
        hash: expect.stringMatching(/[0-f]{64}/),
        previousHash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        version: expect.any(Number),
        time: expect.any(Number),
        medianTime: expect.any(Number),
        transactionCount: expect.any(Number),
        difficulty: expect.any(Number),
        masternode: expect.stringMatching(/[0-f]{64}/),
        minter: expect.stringMatching(/[a-zA-Z0-9]+/),
        minterBlockCount: expect.any(Number),
        stakeModifier: expect.stringMatching(/[0-f]{64}/),
        merkleroot: expect.stringMatching(/[0-f]{64}/),
        size: expect.any(Number),
        sizeStripped: expect.any(Number),
        weight: expect.any(Number)
      })
    )
    expect(block?.height).toStrictEqual(37)
  })

  it('should get block through hash', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const block = await client.block.get(blockHash)
    expect(block).toStrictEqual(
      expect.objectContaining({
        id: expect.stringMatching(/[0-f]{64}/),
        hash: expect.stringMatching(/[0-f]{64}/),
        previousHash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        version: expect.any(Number),
        time: expect.any(Number),
        medianTime: expect.any(Number),
        transactionCount: expect.any(Number),
        difficulty: expect.any(Number),
        masternode: expect.stringMatching(/[0-f]{64}/),
        minter: expect.stringMatching(/[a-zA-Z0-9]+/),
        minterBlockCount: expect.any(Number),
        stakeModifier: expect.stringMatching(/[0-f]{64}/),
        merkleroot: expect.stringMatching(/[0-f]{64}/),
        size: expect.any(Number),
        sizeStripped: expect.any(Number),
        weight: expect.any(Number)
      })
    )
    expect(block?.height).toStrictEqual(37)
  })

  it('should getBlockTransactions through hash', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const transactions = await client.block.getBlockTransactions(blockHash)
    expect(transactions[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
      },
      txid: expect.stringMatching(/[0-f]{64}/),
      hash: expect.stringMatching(/[0-f]{64}/),
      version: expect.any(Number),
      size: expect.any(Number),
      vSize: expect.any(Number),
      weight: expect.any(Number),
      lockTime: expect.any(Number),
      vinCount: expect.any(Number),
      voutCount: expect.any(Number)
    })
    expect(transactions[0].block.height).toStrictEqual(37)
  })

  it('should getBlockTransactions through height', async () => {
    const transactions = await client.block.getBlockTransactions('37')
    expect(transactions[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
      },
      txid: expect.stringMatching(/[0-f]{64}/),
      hash: expect.stringMatching(/[0-f]{64}/),
      version: expect.any(Number),
      size: expect.any(Number),
      vSize: expect.any(Number),
      weight: expect.any(Number),
      lockTime: expect.any(Number),
      vinCount: expect.any(Number),
      voutCount: expect.any(Number)
    })
    expect(transactions[0].block.height).toStrictEqual(37)
  })
})
