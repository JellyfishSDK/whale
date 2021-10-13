import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingPoolPair, TestingToken } from '@defichain/jellyfish-testing'
import { DecodedAddress, fromAddress } from '@defichain/jellyfish-address'
import { CScript } from '@defichain/jellyfish-transaction/dist'

const mn = new MasterNodeRegTestContainer()
let rpc!: JsonRpcClient

let app: NestFastifyApplication
let tokenHelper!: TestingToken
let activityV2Mapper!: ScriptActivityV2Mapper
let testAddress!: string

beforeAll(async () => {
  await mn.start()
  await mn.waitForWalletCoinbaseMaturity()

  rpc = new JsonRpcClient(await mn.getCachedRpcUrl())
  tokenHelper = new TestingToken(mn, rpc)

  await tokenHelper.dfi({ amount: 100 })
  await tokenHelper.create({ symbol: 'BTC' })
  await mn.generate(1)
  await tokenHelper.mint({ symbol: 'BTC', amount: 100 })
  await mn.generate(1)

  testAddress = await mn.getNewAddress()
  await tokenHelper.send({ amount: 10, symbol: 'BTC', address: testAddress })

  const poolPairHelper = new TestingPoolPair(mn, rpc)
  await poolPairHelper.create({ tokenA: 'DFI', tokenB: 'BTC', pairSymbol: 'DFI-BTC' })
  await mn.generate(1)
  await poolPairHelper.add({
    a: {
      symbol: 'DFI',
      amount: 80
    },
    b: {
      symbol: 'BTC',
      amount: 20
    },
    address: testAddress
  })
  await mn.generate(1)

  app = await createTestingApp(mn)
  activityV2Mapper = app.get(ScriptActivityV2Mapper)
})

afterAll(async () => {
  await stopTestingApp(mn, app)
})

describe('poolswap', () => {
  it('should be indexed each spent token', async () => {
    await mn.generate(1)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)
    const scriptHex = new CScript((fromAddress(testAddress, 'regtest') as DecodedAddress).script).toHex()

    {
      // before
      const activities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex), 100)
      expect(activities.length).toStrictEqual(1)
    }

    const txid = await rpc.poolpair.poolSwap({
      to: await mn.getNewAddress(),
      from: testAddress,
      tokenFrom: 'BTC',
      amountFrom: 1.2,
      tokenTo: 'DFI'
    })
    await mn.generate(2)
    const height = await mn.getBlockCount() - 1
    await waitForIndexedHeight(app, height, 100000)

    {
      // after
      const activities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex), 100)
      expect(activities.length).toStrictEqual(2)

      const poolswap = activities.find(a => a.dftx?.type === 'spend-poolswap')
      expect(poolswap).toBeDefined()
      expect(poolswap?.txid).toStrictEqual(txid)
      expect(poolswap?.block).toBeDefined()
      expect(poolswap?.category).toStrictEqual('dftx')
      expect(poolswap?.value).toStrictEqual('-1.2')
      expect(poolswap?.tokenId).toStrictEqual(1) // spent BTC
      const encodedHeight = HexEncoder.encodeHeight(height)
      const activityIndex = HexEncoder.encodeHeight(0)
      expect(poolswap?.id).toStrictEqual(`${encodedHeight}${txid}ff${activityIndex}`)
      expect(poolswap?.dftx?.raw).toBeDefined()
    }
  })
})
