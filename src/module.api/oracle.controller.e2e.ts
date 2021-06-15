import { OraclesController } from '@src/module.api/oracle.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import { NotFoundException } from '@nestjs/common'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: OraclesController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  controller = app.get(OraclesController)
  await setup()
})

afterAll(async () => {
  const data = await container.call('listoracles')

  for (let i = 0; i < data.length; i += 1) {
    await container.call('removeoracle', [data[i]])
  }

  await container.generate(1)

  await stopTestingApp(container, app)
  await container.stop()
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

afterAll(async () => {
  await container.stop()
})

describe('list', () => {
  it('should list', async () => {
    const result = await controller.list({ size: 8 })
    expect(result.data.length).toStrictEqual(8)

    expect(result.data[0]).toStrictEqual(
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

    expect(result.data[1]).toStrictEqual(
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

    expect(result.data[2]).toStrictEqual(
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

    expect(result.data[3]).toStrictEqual(
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

    expect(result.data[4]).toStrictEqual(
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

    expect(result.data[5]).toStrictEqual(
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

    expect(result.data[6]).toStrictEqual(
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

    expect(result.data[7]).toStrictEqual(
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

  it('should list with pagination', async () => {
    const first = await controller.list({ size: 4 })

    expect(first.data.length).toStrictEqual(4)
    expect(first.page?.next).toStrictEqual(oracleid4)

    expect(first.data[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid1 }))
    expect(first.data[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid2 }))
    expect(first.data[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid3 }))
    expect(first.data[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid4 }))

    const next = await controller.list({
      size: 4,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toStrictEqual(oracleid8)

    expect(next.data[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid5 }))
    expect(next.data[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid6 }))
    expect(next.data[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid7 }))
    expect(next.data[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid8 }))

    const last = await controller.list({
      size: 1,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should list empty object as out of range', async () => {
    const result = await controller.list({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get oracle1 with oracleid1', async () => {
    const data = await controller.get(oracleid1)
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

  it('should throw error while getting non-existent oracle', async () => {
    expect.assertions(2)
    try {
      await controller.get('e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find oracle',
        error: 'Not Found'
      })
    }
  })
})

describe('rawPrices', () => {
  it('should getLatestRawPrice', async () => {
    const result = await controller.latestRawPrices({ size: 8 })
    expect(result.data.length).toStrictEqual(8)

    expect(result.data[0]).toStrictEqual(
      {
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid1,
        weightage: new BigNumber(1),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(0.5),
        state: 'live'
      }
    )

    expect(result.data[1]).toStrictEqual(
      {
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid2,
        weightage: new BigNumber(2),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(1),
        state: 'live'
      }
    )

    expect(result.data[2]).toStrictEqual(
      {
        priceFeeds: { token: 'TESLA', currency: 'USD' },
        oracleid: oracleid3,
        weightage: new BigNumber(3),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(1.5),
        state: 'live'
      }
    )

    expect(result.data[3]).toStrictEqual(
      {
        priceFeeds: { token: 'TESLA', currency: 'USD' },
        oracleid: oracleid4,
        weightage: new BigNumber(4),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(2),
        state: 'live'
      }
    )

    expect(result.data[4]).toStrictEqual(
      {
        priceFeeds: { token: 'FB', currency: 'CNY' },
        oracleid: oracleid5,
        weightage: new BigNumber(5),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(2.5),
        state: 'live'
      }
    )

    expect(result.data[5]).toStrictEqual(
      {
        priceFeeds: { token: 'FB', currency: 'CNY' },
        oracleid: oracleid6,
        weightage: new BigNumber(6),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(3),
        state: 'live'
      }
    )

    expect(result.data[6]).toStrictEqual({
      priceFeeds: { token: 'MFST', currency: 'SGD' },
      oracleid: oracleid7,
      weightage: new BigNumber(7),
      timestamp: new BigNumber(timestamp),
      rawprice: new BigNumber(3.5),
      state: 'live'
    }
    )

    expect(result.data[7]).toStrictEqual({
      priceFeeds: { token: 'MFST', currency: 'SGD' },
      oracleid: oracleid8,
      weightage: new BigNumber(8),
      timestamp: new BigNumber(timestamp),
      rawprice: new BigNumber(4),
      state: 'live'
    })
  })

  it('should getLatestRawPrice with pagination', async () => {
    const first = await controller.list({ size: 4 })

    expect(first.data.length).toStrictEqual(4)
    expect(first.page?.next).toStrictEqual(oracleid4)

    expect(first.data[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid1 }))
    expect(first.data[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid2 }))
    expect(first.data[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid3 }))
    expect(first.data[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid4 }))

    const next = await controller.list({
      size: 4,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toStrictEqual(oracleid8)

    expect(next.data[0]).toStrictEqual(expect.objectContaining({ oracleid: oracleid5 }))
    expect(next.data[1]).toStrictEqual(expect.objectContaining({ oracleid: oracleid6 }))
    expect(next.data[2]).toStrictEqual(expect.objectContaining({ oracleid: oracleid7 }))
    expect(next.data[3]).toStrictEqual(expect.objectContaining({ oracleid: oracleid8 }))

    const last = await controller.list({
      size: 1,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should getLatestRawPrice with empty object as out of range', async () => {
    const result = await controller.list({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('listPrices', () => {
  it('should listPrices', async () => {
    const result = await controller.listPrices({ size: 2 })
    expect(result.data.length).toStrictEqual(2)
    // NOTE(jingyi2811): 0.83333333000000 = (0.5 * 1 + 1 * 2) / 3
    // NOTE(jingyi2811): 1.78571428000000 = (1.5 * 3 + 2 * 4) / 7
    expect(result.data).toStrictEqual([
      { token: 'APPLE', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'FB', currency: 'CNY', price: new BigNumber(2.77272727000000), ok: true }
    ])
  })

  it('should listPrices with pagination', async () => {
    const first = await controller.listPrices({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('FB-CNY')

    expect(first.data[0]).toStrictEqual(expect.objectContaining({ token: 'APPLE', currency: 'EUR' }))
    expect(first.data[1]).toStrictEqual(expect.objectContaining({ token: 'FB', currency: 'CNY' }))

    const next = await controller.listPrices({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('TESLA-USD')

    expect(next.data[0]).toStrictEqual(expect.objectContaining({ token: 'MFST', currency: 'SGD' }))
    expect(next.data[1]).toStrictEqual(expect.objectContaining({ token: 'TESLA', currency: 'USD' }))

    const last = await controller.listPrices({
      size: 1,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listPrices with empty object as out of range', async () => {
    const result = await controller.listPrices({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('getPrice', () => {
  it('should get APPLE / USD price with APPLE token and EUR currency', async () => {
    const data = await controller.getPrice('APPLE', 'EUR')
    expect(data.toString()).toStrictEqual(new BigNumber('0.83333333').toString())
  })

  it('should throw error while getting non-existent oracle', async () => {
    expect.assertions(2)
    try {
      await controller.getPrice('BAIDU', 'MYR')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find oracle',
        error: 'Not Found'
      })
    }
  })
})
