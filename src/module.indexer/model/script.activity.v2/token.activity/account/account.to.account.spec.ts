import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingToken } from '@defichain/jellyfish-testing'
import { DecodedAddress, fromAddress } from '@defichain/jellyfish-address'
import { CScript } from '@defichain/jellyfish-transaction/dist'

const dTEST = 'TEST'
const mn = new MasterNodeRegTestContainer()

let app: NestFastifyApplication
let tokenHelper!: TestingToken
let activityV2Mapper!: ScriptActivityV2Mapper

let senderAddress!: string
let recipientAddress!: string

beforeAll(async () => {
  await mn.start()
  await mn.waitForWalletCoinbaseMaturity()
  await mn.waitForWalletBalanceGTE(101)

  senderAddress = await mn.getNewAddress()
  recipientAddress = await mn.getNewAddress()

  const rpcClient = new JsonRpcClient(await mn.getCachedRpcUrl())
  tokenHelper = new TestingToken(mn, rpcClient)

  await tokenHelper.create({ symbol: dTEST })
  await mn.generate(1)
  await tokenHelper.mint({ amount: 1.23, symbol: dTEST })
  await mn.generate(1)
  await tokenHelper.send({
    address: senderAddress,
    amount: 1.23,
    symbol: dTEST
  })
  await mn.generate(2)

  app = await createTestingApp(mn)
  activityV2Mapper = app.get(ScriptActivityV2Mapper)

  // before
  const senderScriptHex = new CScript((fromAddress(senderAddress, 'regtest') as DecodedAddress).script).toHex()
  await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)
  const hid = HexEncoder.asSHA256(senderScriptHex)
  const activities = await activityV2Mapper.query(hid, 100)

  // funded directly from container
  expect(activities.length).toStrictEqual(1)
  expect(activities[0].dftx?.type).toStrictEqual('any-account-to-account-gain')
})

afterAll(async () => {
  await stopTestingApp(mn, app)
})

describe('account-to-account', () => {
  it('should be indexed to both sender and receiver as two unique activityV2', async () => {
    const lastBlock = await mn.getBlockCount()
    const senderRpc = new JsonRpcClient(await mn.getCachedRpcUrl())
    const txid: string = await senderRpc.call('accounttoaccount', [senderAddress, { [recipientAddress]: `1.23@${dTEST}` }], 'number')
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    // after
    const senderScriptHex = new CScript((fromAddress(senderAddress, 'regtest') as DecodedAddress).script).toHex()
    const senderActivities = await activityV2Mapper.query(HexEncoder.asSHA256(senderScriptHex), 100)
    expect(senderActivities.length).toStrictEqual(2)
    const senderNewActivity = senderActivities.find(a => a.dftx?.type === 'spend-account-to-account')
    expect(senderNewActivity).toBeDefined()
    const height = HexEncoder.encodeHeight(lastBlock + 1)
    const senderActivityIndex = HexEncoder.encodeHeight(0)
    expect(senderNewActivity?.txid).toStrictEqual(txid)
    expect(senderNewActivity?.id).toStrictEqual(`${height}${txid}ff${senderActivityIndex}`)
    expect(senderNewActivity?.category).toStrictEqual('dftx')
    expect(senderNewActivity?.tokenId).toStrictEqual(1)
    expect(senderNewActivity?.value).toStrictEqual('-1.23')
    expect(senderNewActivity?.block).toBeDefined()
    expect(senderNewActivity?.dftx?.raw).toBeDefined()

    const receiverScriptHex = new CScript((fromAddress(recipientAddress, 'regtest') as DecodedAddress).script).toHex()
    const receiverActivities = await activityV2Mapper.query(HexEncoder.asSHA256(receiverScriptHex), 100)
    expect(receiverActivities.length).toStrictEqual(1)
    const receiverActivity = receiverActivities[0]
    const receiverActivityIndex = HexEncoder.encodeHeight(1)
    expect(receiverActivity?.dftx?.type).toStrictEqual('account-to-account-gain')
    expect(receiverActivity?.txid).toStrictEqual(txid)
    expect(receiverActivity?.id).toStrictEqual(`${height}${txid}ff${receiverActivityIndex}`)
    expect(receiverActivity?.category).toStrictEqual('dftx')
    expect(receiverActivity?.tokenId).toStrictEqual(1)
    expect(receiverActivity?.value).toStrictEqual('1.23')
    expect(receiverActivity?.block).toBeDefined()
    expect(receiverActivity?.dftx?.raw).toBeDefined()
  })
})
