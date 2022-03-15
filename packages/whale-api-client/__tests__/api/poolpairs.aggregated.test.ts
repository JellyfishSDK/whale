import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { StubWhaleApiClient } from '../stub.client'
import { Testing } from '@defichain/jellyfish-testing'
import { WhaleApiClient } from '../../src'

let container: MasterNodeRegTestContainer
let testing: Testing
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)
  testing = Testing.create(container)

  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await service.start()

  await testing.fixture.createPoolPair({
    a: {
      amount: 300000,
      symbol: 'USD'
    },
    b: {
      amount: 100000,
      symbol: 'DFI'
    }
  })

  await testing.fixture.createPoolPair({
    a: {
      amount: 100000,
      symbol: 'A'
    },
    b: {
      amount: 100000,
      symbol: 'DFI'
    }
  })

  await testing.fixture.createPoolPair({
    a: {
      amount: 200000,
      symbol: 'B'
    },
    b: {
      amount: 100000,
      symbol: 'DFI'
    }
  })

  await testing.token.mint({
    amount: 1000000,
    symbol: 'A'
  })
  await testing.generate(1)

  await testing.token.send({
    amount: 1000000,
    symbol: 'A',
    address: await testing.address('swap')
  })

  await testing.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await testing.container.stop()
  }
})

describe('PoolSwapAggregated', () => {
  // Mock date starting as tomorrow
  let mockDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

  async function generateBlock () {
    mockDate = new Date(mockDate.getTime() + 30 * 1000)
    const epoch = Math.floor(mockDate.getTime() / 1000)

    await testing.rpc.misc.setMockTime(epoch)
    await testing.generate(1)
  }

  beforeAll(async () => {
    // 1 block = 30 seconds
    // 48 * 60 * 60 / 30 = 5760 blocks

    for (let i = 0; i <= 5760; i++) {
      await testing.rpc.poolpair.poolSwap({
        from: await testing.address('swap'),
        tokenFrom: 'A',
        amountFrom: 0.01,
        to: await testing.address('swap'),
        tokenTo: 'DFI'
      })

      await generateBlock()
    }

    const count = await testing.container.getBlockCount()
    await service.waitForIndexedHeight(count)
  })

  it('should get block count of over 5760', async () => {
    const count = await testing.container.getBlockCount()
    expect(count).toBeGreaterThan(5760)
  })
})
