import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingToken } from '@defichain/jellyfish-testing'
import { fromAddress } from '@defichain/jellyfish-address'
import { CScript } from '@defichain/jellyfish-transaction/dist'

const dTEST = 'TEST'
const mn = new MasterNodeRegTestContainer()

let app: NestFastifyApplication
let tokenHelper!: TestingToken
// let poolHelper!: TestingToken

let senderAddress!: string
let recipientAddress!: string

beforeAll(async () => {
  console.log('before all')
  console.log('cp-2')

  // group = new ContainerGroup([
  //   new MasterNodeRegTestContainer(),
  //   new MasterNodeRegTestContainer(),
  //   new MasterNodeRegTestContainer()
  // ])
  // await group.start()

  // whale = group.get(0)
  // sender = group.get(1)
  // receiver = group.get(2)

  // console.log('cp-1')
  await mn.start()
  await mn.waitForWalletCoinbaseMaturity()

  await mn.waitForWalletBalanceGTE(101)
  // await mn.waitForSync()

  senderAddress = await mn.getNewAddress()
  recipientAddress = await mn.getNewAddress()

  const rpcClient = new JsonRpcClient(await mn.getCachedRpcUrl())
  tokenHelper = new TestingToken(mn, rpcClient)

  await tokenHelper.create({ symbol: dTEST })
  await mn.generate(1)
  await tokenHelper.mint({ amount: 1.23, symbol: dTEST })
  await mn.generate(1)
  console.log('cp1')
  await tokenHelper.send({
    address: senderAddress,
    amount: 1.23,
    symbol: dTEST
  })

  await mn.fundAddress(senderAddress, 10) // fund some utxo for fee purpose
  console.log('cp3')
  await mn.generate(1)
  console.log('cp4')

  const height = await mn.getBlockCount()
  app = await createTestingApp(mn)
  console.log('beforeAll, before wait for index')
  await waitForIndexedHeight(app, height - 1)
  console.log('beforeAll, success wait for index')
})

afterAll(async () => {
  await mn.stop()
})

/* eslint-disable @typescript-eslint/no-non-null-assertion */

// async function expectActivitiesV2 (scriptHex: string): Promise<void> {
//   const hid = HexEncoder.asSHA256(scriptHex)
//   const activityV2Mapper = app.get(ScriptActivityV2Mapper)
//   const activities = await activityV2Mapper.query(hid, 100)

//   for (const item of activities) {
//     expect(item.hid).toStrictEqual(hid)
//     expect(item.category).toStrictEqual('utxo')
//     expect(item.dftx).toStrictEqual(undefined)
//     expect(item.utxo?.txid).toStrictEqual(item.txid)
//     expect(item.script.hex).toStrictEqual(scriptHex)
//     expect(Number.parseFloat(item.value)).toBeGreaterThanOrEqual(0)
//   }
// }

describe('76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac', () => {
  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'

  it('should wait for block height 0', async () => {
    const senderRpc = new JsonRpcClient(await mn.getCachedRpcUrl())
    // const senderTokenHelper = new TestingToken(sender, senderRpc)
    // await senderTokenHelper.send({
    //   address: recipientAddress,
    //   amount: 1.23,
    //   symbol: dTEST
    // })
    const result = await senderRpc.call('accounttoaccount', [senderAddress, { [recipientAddress]: `1.23@${dTEST}` }], 'number')
    console.log(result)

    await mn.generate(1)

    console.log('test, before wait for index')
    await waitForIndexedHeight(app, await mn.getBlockCount() - 1, 100000)
    console.log('test, success wait for index')

    const decoded = fromAddress(senderAddress, 'regtest')
    if (decoded === undefined) throw new Error('Container provided invalid address?')
    const senderScriptHex = new CScript(decoded.script).toHex()
    const activityV2Mapper = app.get(ScriptActivityV2Mapper)
    const hid = HexEncoder.asSHA256(senderScriptHex)
    const activities = await activityV2Mapper.query(hid, 100)
    console.log(activities)
  })
})
