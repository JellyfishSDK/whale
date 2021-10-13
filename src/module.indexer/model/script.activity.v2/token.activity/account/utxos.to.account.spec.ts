import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DecodedAddress, fromAddress } from '@defichain/jellyfish-address'
import { CScript } from '@defichain/jellyfish-transaction/dist'

const mn = new MasterNodeRegTestContainer()

let app: NestFastifyApplication
let activityV2Mapper!: ScriptActivityV2Mapper

let testAddress!: string

beforeAll(async () => {
  await mn.start()
  await mn.waitForWalletCoinbaseMaturity()
  await mn.waitForWalletBalanceGTE(10)

  await mn.fundAddress(testAddress, 5) // fund some utxo for fee purpose
  await mn.generate(1)

  app = await createTestingApp(mn)
  activityV2Mapper = app.get(ScriptActivityV2Mapper)

  // before
  testAddress = await mn.getNewAddress()
  const senderScriptHex = new CScript((fromAddress(testAddress, 'regtest') as DecodedAddress).script).toHex()
  await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)
  const hid = HexEncoder.asSHA256(senderScriptHex)
  const activities = await activityV2Mapper.query(hid, 100)
  // started empty
  expect(activities.length).toStrictEqual(0)
})

afterAll(async () => {
  await app.close()
})

describe('utxos-to-account', () => {
  it('should be indexed to both sender and receiver as two unique activityV2', async () => {
    const lastBlock = await mn.getBlockCount()
    const senderRpc = new JsonRpcClient(await mn.getCachedRpcUrl())
    const accountAddress = await mn.getNewAddress()
    const txid = await senderRpc.account.utxosToAccount({ [accountAddress]: '1.23@DFI' })
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    // after
    const scriptHex = new CScript((fromAddress(accountAddress, 'regtest') as DecodedAddress).script).toHex()
    const senderActivities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex), 100)
    expect(senderActivities.length).toStrictEqual(2)
    const newActivity = senderActivities.find(a => a.dftx?.type === 'utxos-to-account-gain')
    expect(newActivity).toBeDefined()
    const height = HexEncoder.encodeHeight(lastBlock + 1)
    const activityIndex = HexEncoder.encodeHeight(0)
    expect(newActivity?.txid).toStrictEqual(txid)
    expect(newActivity?.id).toStrictEqual(`${height}${txid}ff${activityIndex}`)
    expect(newActivity?.category).toStrictEqual('dftx')
    expect(newActivity?.tokenId).toStrictEqual(0)
    expect(newActivity?.value).toStrictEqual('1.23')
    expect(newActivity?.block).toBeDefined()
    expect(newActivity?.dftx?.raw).toBeDefined()
  })

  it('multiple output address address should be indexed as under different hid', async () => {
    const lastBlock = await mn.getBlockCount()
    const senderRpc = new JsonRpcClient(await mn.getCachedRpcUrl())

    const dest1 = await mn.getNewAddress()
    const dest2 = await mn.getNewAddress()

    const txid = await senderRpc.account.utxosToAccount({
      [dest1]: '0.1@DFI',
      [dest2]: '0.2@DFI'
    })
    await mn.generate(2)
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)

    // after
    const scriptHex1 = new CScript((fromAddress(dest1, 'regtest') as DecodedAddress).script).toHex()
    const dest1Activities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex1), 100)
    expect(dest1Activities.length).toStrictEqual(1)
    const dest1Activity = dest1Activities.find(a => a.dftx?.type === 'utxos-to-account-gain')
    expect(dest1Activity).toBeDefined()
    const height = HexEncoder.encodeHeight(lastBlock + 1)
    const activityIndex = HexEncoder.encodeHeight(0)
    expect(dest1Activity?.txid).toStrictEqual(txid)
    expect(dest1Activity?.id).toStrictEqual(`${height}${txid}ff${activityIndex}`)
    expect(dest1Activity?.category).toStrictEqual('dftx')
    expect(dest1Activity?.tokenId).toStrictEqual(0)
    expect(dest1Activity?.value).toStrictEqual('0.1')
    expect(dest1Activity?.block).toBeDefined()
    expect(dest1Activity?.dftx?.raw).toBeDefined()

    const scriptHex2 = new CScript((fromAddress(dest2, 'regtest') as DecodedAddress).script).toHex()
    const dest2Activities = await activityV2Mapper.query(HexEncoder.asSHA256(scriptHex2), 100)
    expect(dest1Activities.length).toStrictEqual(1)
    const dest2Activity = dest2Activities.find(a => a.dftx?.type === 'utxos-to-account-gain')
    expect(dest2Activity).toBeDefined()
    const activityIndex2 = HexEncoder.encodeHeight(1)
    expect(dest2Activity?.txid).toStrictEqual(txid) // same txid
    expect(dest2Activity?.id).toStrictEqual(`${height}${txid}ff${activityIndex2}`)
    expect(dest2Activity?.category).toStrictEqual('dftx')
    expect(dest2Activity?.tokenId).toStrictEqual(0)
    expect(dest2Activity?.value).toStrictEqual('0.2')
    expect(dest2Activity?.block).toBeDefined()
    expect(dest2Activity?.dftx?.raw).toBeDefined()
  })
})
