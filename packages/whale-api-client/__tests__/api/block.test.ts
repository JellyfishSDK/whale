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
    const blocks = await client.blocks.list()
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[0].height).toBeGreaterThanOrEqual(100)
  }, 30000)
  await container.waitForWalletBalanceGTE(100)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should get paginated list of blocks', async () => {
    const first = await client.blocks.list(40)
    expect(first.length).toStrictEqual(40)

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
    expect(second[0].height).toStrictEqual(first[39].height - 1)
    expect(second.length).toStrictEqual(40)

    const last = await client.paginate(second)
    expect(last[0].height).toStrictEqual(second[39].height - 1)
    expect(last.hasNext).toStrictEqual(false)
  })
})

describe('get', () => {
  it('should get block through height', async () => {
    const block = await client.blocks.get('37')

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
    const block = await client.blocks.get(blockHash)
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

  it('should get undefined through invalid hash', async () => {
    const block = await client.blocks.get('d78167c999ed24b999de6530d6b7d9d723096e49baf191bd2706ddb8eaf452ae')
    expect(block).toBeUndefined()
  })

  it('should get undefined through invalid height', async () => {
    const block = await client.blocks.get('1000000000')
    expect(block).toBeUndefined()
  })
})

describe('getTransactions', () => {
  it('should getTransactions through hash', async () => {
    const blockHash = await container.call('getblockhash', [37])
    const transactions = await client.blocks.getTransactions(blockHash)
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

  it('should getTransactions through height', async () => {
    const transactions = await client.blocks.getTransactions('37')
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

  it('should getTransactions through invalid hash', async () => {
    const transactions = await client.blocks.getTransactions('b33320d63574690eb549ee4867c0119efdb69b396d3452bf9a09132eaa76b4a5')
    expect(transactions.length).toStrictEqual(0)
  })

  it('should getTransactions through invalid height', async () => {
    const transactions = await client.blocks.getTransactions('1000000000')
    expect(transactions.length).toStrictEqual(0)
  })
})
