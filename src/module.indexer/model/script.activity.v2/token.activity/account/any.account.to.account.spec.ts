import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingToken } from '@defichain/jellyfish-testing'
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
  await mn.generate(2)

  app = await createTestingApp(mn)
  activityV2Mapper = app.get(ScriptActivityV2Mapper)
})

afterAll(async () => {
  await stopTestingApp(mn, app)
})

describe('any-account-to-account', () => {
  it('should be indexed to both sender and receiver as two unique activityV2', async () => {
    const from = await mn.getNewAddress()
    const to = await mn.getNewAddress()

    await tokenHelper.dfi({ amount: 0.123, address: from })
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    const senderScriptHex = new CScript((fromAddress(from, 'regtest') as DecodedAddress).script).toHex()
    const senderActivitiesBefore = await activityV2Mapper.query(HexEncoder.asSHA256(senderScriptHex), 100)
    expect(senderActivitiesBefore.length).toStrictEqual(1)
    expect(senderActivitiesBefore[0].dftx?.type).toStrictEqual('utxos-to-account-gain') // prefunded DFI

    const lastBlock = await mn.getBlockCount() // block height where new tx happen

    const txid = await rpc.account.sendTokensToAddress(
      { [from]: ['0.123@DFI'] },
      { [to]: ['0.123@DFI'] }
    )
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    // after
    const senderActivities = await activityV2Mapper.query(HexEncoder.asSHA256(senderScriptHex), 100)
    expect(senderActivities.length).toStrictEqual(2) // 1 prefunded
    const newActivity = senderActivities.find(a => a.dftx?.type === 'spend-any-account-to-account')
    expect(newActivity).toBeDefined()
    const height = HexEncoder.encodeHeight(lastBlock + 1)
    const activityIndex = HexEncoder.encodeHeight(0)
    expect(newActivity?.txid).toStrictEqual(txid)
    expect(newActivity?.id).toStrictEqual(`${height}${txid}ff${activityIndex}`)
    expect(newActivity?.category).toStrictEqual('dftx')
    expect(newActivity?.tokenId).toStrictEqual(0)
    expect(newActivity?.value).toStrictEqual('-0.123')
    expect(newActivity?.block).toBeDefined()
    expect(newActivity?.dftx?.raw).toBeDefined()

    const receiverScriptHex = new CScript((fromAddress(to, 'regtest') as DecodedAddress).script).toHex()
    const receiverActivities = await activityV2Mapper.query(HexEncoder.asSHA256(receiverScriptHex), 100)
    expect(receiverActivities.length).toStrictEqual(1) // 1 prefunded

    const receiverActivity = receiverActivities[0]
    expect(receiverActivity.dftx?.type).toStrictEqual('any-account-to-account-gain')
    const secondActivityIndex = HexEncoder.encodeHeight(1) // of the txid
    expect(receiverActivity?.txid).toStrictEqual(txid)
    expect(receiverActivity?.id).toStrictEqual(`${height}${txid}ff${secondActivityIndex}`)
    expect(receiverActivity?.category).toStrictEqual('dftx')
    expect(receiverActivity?.tokenId).toStrictEqual(0)
    expect(receiverActivity?.value).toStrictEqual('0.123')
    expect(receiverActivity?.block).toBeDefined()
    expect(receiverActivity?.dftx?.raw).toBeDefined()
  })
})
