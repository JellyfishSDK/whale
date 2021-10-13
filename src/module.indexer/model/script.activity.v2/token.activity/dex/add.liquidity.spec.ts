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

beforeAll(async () => {
  await mn.start()
  await mn.waitForWalletCoinbaseMaturity()
  await mn.waitForWalletBalanceGTE(21)

  rpc = new JsonRpcClient(await mn.getCachedRpcUrl())
  tokenHelper = new TestingToken(mn, rpc)
  await mn.generate(1)

  await tokenHelper.dfi({ amount: 100 })
  await tokenHelper.create({ symbol: 'BTC' })
  await mn.generate(1)
  await tokenHelper.mint({ symbol: 'BTC', amount: 100 })
  await mn.generate(1)

  const poolPairHelper = new TestingPoolPair(mn, rpc)
  await poolPairHelper.create({ tokenA: 'DFI', tokenB: 'BTC' })
  await mn.generate(1)

  app = await createTestingApp(mn)
  activityV2Mapper = app.get(ScriptActivityV2Mapper)
})

afterAll(async () => {
  await stopTestingApp(mn, app)
})

describe('add-liquidity', () => {
  it('should be indexed each spent token', async () => {
    const testAddress = await mn.getNewAddress()
    await tokenHelper.send({ address: testAddress, amount: 10, symbol: 'DFI' })
    await tokenHelper.send({ address: testAddress, amount: 10, symbol: 'BTC' })
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    const scriptHex = new CScript((fromAddress(testAddress, 'regtest') as DecodedAddress).script).toHex()

    {
      // before
      const activities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex), 100)
      expect(activities.length).toStrictEqual(2)

      // receive DFI and BTC for testing
      expect(activities.every(a => a.dftx?.type === 'any-account-to-account-gain'))
      expect(activities.every(a => a.value === '10'))
      expect(activities.find(a => a.tokenId === 0)).toBeDefined()
      expect(activities.find(a => a.tokenId === 1)).toBeDefined()
    }

    const txid = await rpc.poolpair.addPoolLiquidity({
      [testAddress]: ['0.123@DFI', '0.123@BTC']
    }, testAddress)
    await mn.generate(2)
    const height = await mn.getBlockCount()

    await waitForIndexedHeight(app, height - 1, 100000)

    {
      // after
      const activities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex), 100)
      expect(activities.length).toStrictEqual(4)

      const addLiqActivitites = activities.filter(a => a.dftx?.type === 'spend-add-liquidity')
      expect(addLiqActivitites.length).toStrictEqual(2)

      const addDfiToLiq = addLiqActivitites.find(a => a.tokenId === 0)
      expect(addDfiToLiq).toBeDefined()
      expect(addDfiToLiq?.category).toStrictEqual('dftx')
      expect(addDfiToLiq?.value).toStrictEqual('-0.123')
      expect(addDfiToLiq?.block).toBeDefined()
      expect(addDfiToLiq?.txid).toStrictEqual(txid)
      const encodedHeight = HexEncoder.encodeHeight(height)
      expect(addDfiToLiq?.id).toContain(`${encodedHeight}${txid}ff`) // skipping last part check, it could be 0x00 or 0x01 (HexEncoder)
      expect(addDfiToLiq?.dftx?.raw).toBeDefined()

      const addBtcToLiq = addLiqActivitites.find(a => a.tokenId === 1)
      expect(addBtcToLiq).toBeDefined()
      expect(addBtcToLiq?.category).toStrictEqual('dftx')
      expect(addBtcToLiq?.value).toStrictEqual('-0.123')
      expect(addBtcToLiq?.block).toBeDefined()
      expect(addBtcToLiq?.txid).toStrictEqual(txid)
      expect(addBtcToLiq?.id).toContain(`${encodedHeight}${txid}ff`) // skipping last part check, it could be 0x00 or 0x01 (HexEncoder)
      expect(addBtcToLiq?.dftx?.raw).toBeDefined()
    }
  })
})
