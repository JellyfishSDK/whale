import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import BigNumber from 'bignumber.js'

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

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

let oracleid1: string
let oracleid2: string
let oracleid3: string
let oracleid4: string
let oracleid5: string
let oracleid6: string
let oracleid7: string
let oracleid8: string
let timestamp: number

async function setup (): Promise<void> {
  const priceFeeds1 = [
    { token: 'APPLE', currency: 'EUR' }
  ]

  const priceFeeds2 = [
    { token: 'TESLA', currency: 'USD' }
  ]

  const priceFeeds3 = [
    { token: 'FB', currency: 'CNY' }
  ]

  const priceFeeds4 = [
    { token: 'MFST', currency: 'SGD' }
  ]

  oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])
  oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 2])
  oracleid3 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 3])
  oracleid4 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 4])
  oracleid5 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds3, 5])
  oracleid6 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds3, 6])
  oracleid7 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds4, 7])
  oracleid8 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds4, 8])

  await container.generate(1)

  timestamp = Math.floor(new Date().getTime() / 1000)

  const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
  await container.call('setoracledata', [oracleid1, timestamp, prices1])

  const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
  await container.call('setoracledata', [oracleid2, timestamp, prices2])

  const prices3 = [{ tokenAmount: '1.5@TESLA', currency: 'USD' }]
  await container.call('setoracledata', [oracleid3, timestamp, prices3])

  const prices4 = [{ tokenAmount: '2.0@TESLA', currency: 'USD' }]
  await container.call('setoracledata', [oracleid4, timestamp, prices4])

  const prices5 = [{ tokenAmount: '2.5@FB', currency: 'CNY' }]
  await container.call('setoracledata', [oracleid5, timestamp, prices5])

  const prices6 = [{ tokenAmount: '3.0@FB', currency: 'CNY' }]
  await container.call('setoracledata', [oracleid6, timestamp, prices6])

  const prices7 = [{ tokenAmount: '3.5@MFST', currency: 'SGD' }]
  await container.call('setoracledata', [oracleid7, timestamp, prices7])

  const prices8 = [{ tokenAmount: '4.0@MFST', currency: 'SGD' }]
  await container.call('setoracledata', [oracleid8, timestamp, prices8])

  await container.generate(1)
}

describe('list', () => {
  it('should listOracles', async () => {
    const result = await client.oracle.list()

    expect(result.length).toStrictEqual(8)

    expect(result[0]).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleid1,
        address: expect.any(String),
        priceFeeds: [
          { token: 'APPLE', currency: 'EUR' }
        ],
        tokenPrices: [
          {
            amount: 0.5,
            currency: 'EUR',
            timestamp,
            token: 'APPLE'
          }
        ]
      }
    )

    expect(result[1]).toStrictEqual(
      {
        weightage: 2,
        oracleid: oracleid2,
        address: expect.any(String),
        priceFeeds: [
          { token: 'APPLE', currency: 'EUR' }
        ],
        tokenPrices: [
          {
            amount: 1.0,
            currency: 'EUR',
            timestamp,
            token: 'APPLE'
          }
        ]
      }
    )

    expect(result[2]).toStrictEqual(
      {
        weightage: 3,
        oracleid: oracleid3,
        address: expect.any(String),
        priceFeeds: [
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: [
          {
            amount: 1.5,
            currency: 'USD',
            timestamp,
            token: 'TESLA'
          }
        ]
      }
    )

    expect(result[3]).toStrictEqual(
      {
        weightage: 4,
        oracleid: oracleid4,
        address: expect.any(String),
        priceFeeds: [
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: [
          {
            amount: 2.0,
            currency: 'USD',
            timestamp,
            token: 'TESLA'
          }
        ]
      }
    )

    expect(result[4]).toStrictEqual(
      {
        weightage: 5,
        oracleid: oracleid5,
        address: expect.any(String),
        priceFeeds: [
          { token: 'FB', currency: 'CNY' }
        ],
        tokenPrices: [
          {
            amount: 2.5,
            currency: 'CNY',
            timestamp,
            token: 'FB'
          }
        ]
      }
    )

    expect(result[5]).toStrictEqual(
      {
        weightage: 6,
        oracleid: oracleid6,
        address: expect.any(String),
        priceFeeds: [
          { token: 'FB', currency: 'CNY' }
        ],
        tokenPrices: [
          {
            amount: 3.0,
            currency: 'CNY',
            timestamp,
            token: 'FB'
          }
        ]
      }
    )

    expect(result[6]).toStrictEqual(
      {
        weightage: 7,
        oracleid: oracleid7,
        address: expect.any(String),
        priceFeeds: [
          { token: 'MFST', currency: 'SGD' }
        ],
        tokenPrices: [
          {
            amount: 3.5,
            currency: 'SGD',
            timestamp,
            token: 'MFST'
          }
        ]
      }
    )

    expect(result[7]).toStrictEqual(
      {
        weightage: 8,
        oracleid: oracleid8,
        address: expect.any(String),
        priceFeeds: [
          { token: 'MFST', currency: 'SGD' }
        ],
        tokenPrices: [
          {
            amount: 4.0,
            currency: 'SGD',
            timestamp,
            token: 'MFST'
          }
        ]
      }
    )
  })

  it('should listOracles with pagination', async () => {
    const first = await client.oracle.list(4)

    expect(first.length).toStrictEqual(4)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(oracleid4)

    expect(first[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid1 }))
    expect(first[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid2 }))
    expect(first[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid3 }))
    expect(first[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid4 }))

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(4)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(oracleid8)

    expect(next[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid5 }))
    expect(next[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid6 }))
    expect(next[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid7 }))
    expect(next[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid8 }))

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('get', () => {
  it('should get oracle by oracleid', async () => {
    const data = await client.oracle.get(oracleid1)

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleid1,
        address: expect.any(String),
        priceFeeds: [
          { token: 'APPLE', currency: 'EUR' }
        ],
        tokenPrices: [
          {
            amount: 0.5,
            currency: 'EUR',
            timestamp,
            token: 'APPLE'
          }
        ]
      }
    )
  })

  it('should fail due to getting non-existent oracle', async () => {
    expect.assertions(2)
    try {
      await client.oracle.get('e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find oracle',
        url: '/v1/regtest/oracles/e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
      })
    }
  })

  it('should fail due to id is malformed', async () => {
    expect.assertions(2)
    try {
      await client.oracle.get('$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'RpcApiError: \'oracleid must be of length 64 (not 3, for \'$*@\')\', code: -8, method: getoracledata',
        url: '/v1/regtest/oracles/$*@'
      })
    }
  })
})

describe('latestRawPrice', () => {
  it('should getLatestRawPrice', async () => {
    const result = await client.oracle.listLatestRawPrices()

    expect(result.length).toStrictEqual(8)
    expect(result[0]).toStrictEqual(
      {
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid1,
        weightage: 1,
        timestamp,
        rawprice: 0.5,
        state: 'live'
      }
    )

    expect(result[1]).toStrictEqual(
      {
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid2,
        weightage: 2,
        timestamp,
        rawprice: 1,
        state: 'live'
      }
    )

    expect(result[2]).toStrictEqual(
      {
        priceFeeds: { token: 'TESLA', currency: 'USD' },
        oracleid: oracleid3,
        weightage: 3,
        timestamp,
        rawprice: 1.5,
        state: 'live'
      }
    )

    expect(result[3]).toStrictEqual(
      {
        priceFeeds: { token: 'TESLA', currency: 'USD' },
        oracleid: oracleid4,
        weightage: 4,
        timestamp,
        rawprice: 2,
        state: 'live'
      }
    )

    expect(result[4]).toStrictEqual(
      {
        priceFeeds: { token: 'FB', currency: 'CNY' },
        oracleid: oracleid5,
        weightage: 5,
        timestamp,
        rawprice: 2.5,
        state: 'live'
      }
    )

    expect(result[5]).toStrictEqual(
      {
        priceFeeds: { token: 'FB', currency: 'CNY' },
        oracleid: oracleid6,
        weightage: 6,
        timestamp,
        rawprice: 3,
        state: 'live'
      }
    )

    expect(result[6]).toStrictEqual(
      {
        priceFeeds: { token: 'MFST', currency: 'SGD' },
        oracleid: oracleid7,
        weightage: 7,
        timestamp,
        rawprice: 3.5,
        state: 'live'
      }
    )

    expect(result[7]).toStrictEqual(
      {
        priceFeeds: { token: 'MFST', currency: 'SGD' },
        oracleid: oracleid8,
        weightage: 8,
        timestamp,
        rawprice: 4,
        state: 'live'
      }
    )
  }
  )

  it('should getLatestRawPrice with pagination', async () => {
    const first = await client.oracle.listLatestRawPrices(4)

    expect(first.length).toStrictEqual(4)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual(oracleid4)

    expect(first[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid1 }))
    expect(first[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid2 }))
    expect(first[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid3 }))
    expect(first[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid4 }))

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(4)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(oracleid8)

    expect(next[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid5 }))
    expect(next[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid6 }))
    expect(next[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid7 }))
    expect(next[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid8 }))

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('prices', () => {
  it('should listPrices', async () => {
    const result = await client.oracle.listPrices()

    expect(result[0]).toStrictEqual(
      { token: 'APPLE', currency: 'EUR', price: 0.83333333, ok: true }
    )

    expect(result[1]).toStrictEqual(
      { token: 'FB', currency: 'CNY', price: 2.77272727, ok: true }
    )

    expect(result[2]).toStrictEqual(
      { token: 'MFST', currency: 'SGD', price: 3.76666666, ok: true }
    )

    expect(result[3]).toStrictEqual(
      { token: 'TESLA', currency: 'USD', price: 1.78571428, ok: true }
    )
  })

  it('should listPrices with pagination', async () => {
    const first = await client.oracle.listPrices(2)

    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('FB-CNY')

    expect(first[0]).toStrictEqual(expect.objectContaining({ token: 'APPLE', currency: 'EUR' }))
    expect(first[1]).toStrictEqual(expect.objectContaining({ token: 'FB', currency: 'CNY' }))

    const next = await client.paginate(first)

    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('TESLA-USD')

    expect(next[0]).toStrictEqual(expect.objectContaining({ token: 'MFST', currency: 'SGD' }))
    expect(next[1]).toStrictEqual(expect.objectContaining({ token: 'TESLA', currency: 'USD' }))

    const last = await client.paginate(next)

    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()
  })
})

describe('getPrice', () => {
  it('should getPrice', async () => {
    const data = await client.oracle.getPrice('APPLE', 'EUR')
    expect(data.toString()).toStrictEqual(new BigNumber('0.83333333').toString())
  })

  it('should fail due to getting non-existent token and currency', async () => {
    expect.assertions(2)
    try {
      await client.oracle.getPrice('BAIDU', 'MYR')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find oracle',
        url: '/v1/regtest/oracles/price/BAIDU/MYR'
      })
    }
  })

  it('should fail due to token and currency are malformed', async () => {
    expect.assertions(2)
    try {
      await client.oracle.getPrice('$*@', '$*@')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find oracle',
        url: '/v1/regtest/oracles/price/$*@/$*@'
      })
    }
  })
})
