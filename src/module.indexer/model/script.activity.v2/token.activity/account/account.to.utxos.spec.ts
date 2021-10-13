import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingToken } from '@defichain/jellyfish-testing'
import { DecodedAddress, fromAddress } from '@defichain/jellyfish-address'
import { CScript } from '@defichain/jellyfish-transaction/dist'

const mn = new MasterNodeRegTestContainer()

let app: NestFastifyApplication
let tokenHelper!: TestingToken
let activityV2Mapper!: ScriptActivityV2Mapper

let testAddress!: string

beforeAll(async () => {
  await mn.start()
  await mn.waitForWalletCoinbaseMaturity()
  await mn.waitForWalletBalanceGTE(10)

  testAddress = await mn.getNewAddress()

  const rpcClient = new JsonRpcClient(await mn.getCachedRpcUrl())
  tokenHelper = new TestingToken(mn, rpcClient)

  await tokenHelper.dfi({ amount: 1.23 })
  await mn.generate(1)
  await tokenHelper.send({
    address: testAddress,
    amount: 1.23,
    symbol: 'DFI'
  })

  await mn.fundAddress(testAddress, 5) // fund some utxo for fee purpose
  await mn.generate(1)

  app = await createTestingApp(mn)
  activityV2Mapper = app.get(ScriptActivityV2Mapper)

  // before
  const senderScriptHex = new CScript((fromAddress(testAddress, 'regtest') as DecodedAddress).script).toHex()
  await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)
  const hid = HexEncoder.asSHA256(senderScriptHex)
  const activities = await activityV2Mapper.query(hid, 100)

  // funded directly from container
  expect(activities.length).toStrictEqual(1)
  expect(activities[0].dftx?.type).toStrictEqual('any-account-to-account-gain')
})

afterAll(async () => {
  await app.close()
})

describe('account-to-utxos', () => {
  it('should be indexed to both sender and receiver as two unique activityV2', async () => {
    const lastBlock = await mn.getBlockCount()
    const senderRpc = new JsonRpcClient(await mn.getCachedRpcUrl())
    const txid = await senderRpc.account.accountToUtxos(testAddress, { [await mn.getNewAddress()]: '1.23@DFI' })
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    // after
    const senderScriptHex = new CScript((fromAddress(testAddress, 'regtest') as DecodedAddress).script).toHex()
    const senderActivities = await activityV2Mapper.query(HexEncoder.asSHA256(senderScriptHex), 100)
    expect(senderActivities.length).toStrictEqual(2)
    const senderNewActivity = senderActivities.find(a => a.dftx?.type === 'spend-account-to-utxos')
    expect(senderNewActivity).toBeDefined()
    const height = HexEncoder.encodeHeight(lastBlock + 1)
    const senderActivityIndex = HexEncoder.encodeHeight(0)
    expect(senderNewActivity?.txid).toStrictEqual(txid)
    expect(senderNewActivity?.id).toStrictEqual(`${height}${txid}ff${senderActivityIndex}`)
    expect(senderNewActivity?.category).toStrictEqual('dftx')
    expect(senderNewActivity?.tokenId).toStrictEqual(0)
    expect(senderNewActivity?.value).toStrictEqual('-1.23')
    expect(senderNewActivity?.block).toBeDefined()
    expect(senderNewActivity?.dftx?.raw).toBeDefined()
  })
})
