import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleController } from '@src/module.api/oracle.controller'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: OracleController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
  const app: TestingModule = await Test.createTestingModule({
    controllers: [OracleController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()
  controller = app.get<OracleController>(OracleController)
})

afterAll(async () => {
  await container.stop()
})

// NOTE(jingyi2811): The test below should involves all 9 oracles rpcs.
describe('oracle', () => {
  it('should list', async () => {
    // appointoracle
    const priceFeeds = [
      { token: 'APPLE', currency: 'EUR' }
    ]

    const oracleid1 = await controller.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })
    const oracleid2 = await controller.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 2 })
    const oracleid3 = await controller.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 2 })
    const oracleid4 = await controller.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 3 })

    await container.generate(1)

    // removeoracle
    await controller.removeOracle(oracleid4)

    await container.generate(1)

    // updateoracle
    await controller.updateOracle(oracleid3, await container.getNewAddress(), {
      priceFeeds: [{ token: 'TESLA', currency: 'USD' }],
      weightage: 3
    })

    await container.generate(1)

    // setoracledata
    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await client.oracle.setOracleData(oracleid1, timestamp, { prices: prices1 })

    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await client.oracle.setOracleData(oracleid2, timestamp, { prices: prices2 })

    const prices3 = [{ tokenAmount: '1.5@TESLA', currency: 'USD' }]
    await client.oracle.setOracleData(oracleid3, timestamp, { prices: prices3 })

    await container.generate(1)

    // getoracledata
    const getData = await controller.get(oracleid1)

    expect(getData).toStrictEqual(
      {
        address: expect.any(String),
        oracleid: oracleid1,
        priceFeeds: [{ currency: 'EUR', token: 'APPLE' }],
        tokenPrices: [{ amount: 0.5, currency: 'EUR', timestamp, token: 'APPLE' }],
        weightage: 1
      }
    )

    // listoracles
    const listData = await controller.list()

    expect(listData.length).toStrictEqual(3)
    expect(typeof listData[0]).toStrictEqual('string')
    expect(listData[0].length).toStrictEqual(64)
    expect(typeof listData[1]).toStrictEqual('string')
    expect(listData[1].length).toStrictEqual(64)
    expect(typeof listData[2]).toStrictEqual('string')
    expect(listData[2].length).toStrictEqual(64)

    // listlatestrawprices
    const listLatestRawPricesData = await container.call('listlatestrawprices')
    const result1 = listLatestRawPricesData.filter((element: { oracleid: any }) => element.oracleid === oracleid1)
    expect(result1).toStrictEqual(
      [
        {
          priceFeeds: { token: 'APPLE', currency: 'EUR' },
          oracleid: oracleid1,
          weightage: 1,
          timestamp: timestamp,
          rawprice: 0.5,
          state: 'live'
        }
      ]
    )

    const result2 = listLatestRawPricesData.filter((element: { oracleid: any }) => element.oracleid === oracleid2)
    expect(result2).toStrictEqual(
      [
        {
          priceFeeds: { token: 'APPLE', currency: 'EUR' },
          oracleid: oracleid2,
          weightage: 2,
          timestamp,
          rawprice: 1,
          state: 'live'
        }
      ]
    )

    const result3 = listLatestRawPricesData.filter((element: { oracleid: any }) => element.oracleid === oracleid3)
    expect(result3).toStrictEqual(
      [
        {
          priceFeeds: { token: 'TESLA', currency: 'USD' },
          oracleid: oracleid3,
          weightage: 3,
          timestamp,
          rawprice: 1.5,
          state: 'live'
        }
      ]
    )

    // getPrice
    const getPriceData = await container.call('getprice', [{ token: 'APPLE', currency: 'EUR' }])
    expect(getPriceData).toStrictEqual(0.83333333)

    // listPrices
    const listPricesData = await container.call('listprices')
    expect(listPricesData).toStrictEqual(
      [
        {
          currency: 'EUR',
          ok: true,
          price: 0.83333333,
          token: 'APPLE'
        },
        {
          currency: 'USD',
          ok: true,
          price: 1.5,
          token: 'TESLA'
        }
      ]
    )
  })
})
