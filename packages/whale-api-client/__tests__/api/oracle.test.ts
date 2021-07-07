import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { OracleState } from '../../src/api/oracle'

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
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('Get all', () => {
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' },
      { token: 'TESL', currency: 'USD' }
    ]

    await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MFST', currency: 'SGD' }
    ]

    await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 1])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  beforeAll(async () => {
    await setup()
  })

  it('should get all price feeds 5 blocks after the oracle was updated', async () => {
    await service.waitForIndexedHeight(height + 5)

    const result = await client.oracle.getPriceFeeds() ?? []

    expect(result[0]?.data.token).toStrictEqual('APPL')
    expect(result[0]?.data.currency).toStrictEqual('EUR')

    expect(result[1]?.data.token).toStrictEqual('TESL')
    expect(result[1]?.data.currency).toStrictEqual('USD')

    expect(result[2]?.data.token).toStrictEqual('FB')
    expect(result[2]?.data.currency).toStrictEqual('CNY')

    expect(result[3]?.data.token).toStrictEqual('MFST')
    expect(result[3]?.data.currency).toStrictEqual('SGD')
  })
})

describe('Get', () => {
  let oracleId: string
  let height: number

  async function setup (): Promise<void> {
    const priceFeeds1 = [
      { token: 'APPL', currency: 'EUR' }
    ]
    oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])

    await container.generate(1)

    const priceFeeds2 = [
      { token: 'TESL', currency: 'USD' }
    ]

    await container.call('updateoracle', [oracleId, await container.getNewAddress(), priceFeeds2, 2])

    await container.generate(1)

    height = await container.call('getblockcount')
  }

  beforeAll(async () => {
    await setup()
  })

  it('should get all price feeds by oracleId 5 blocks after the oracle was updated', async () => {
    await service.waitForIndexedHeight(height + 5)

    const result = await client.oracle.getPriceFeedById(oracleId) ?? []

    expect(result[0]?.data.token).toStrictEqual('APPL')
    expect(result[0]?.data.currency).toStrictEqual('EUR')
    expect(result[0]?.state).toStrictEqual(OracleState.REMOVED)

    expect(result[1]?.data.token).toStrictEqual('TESL')
    expect(result[1]?.data.currency).toStrictEqual('USD')
    expect(result[1]?.state).toStrictEqual(OracleState.LIVE)
  })

  it('should return empty array if get price feed with invalid oracleId', async () => {
    await service.waitForIndexedHeight(height)

    const result = await client.oracle.getPriceFeedById('invalid')

    expect(result).toStrictEqual([])
  })
})
