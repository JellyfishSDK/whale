import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MempoolController } from '@src/module.api/mempool.controller'
import { NotFoundException } from '@nestjs/common'
import { wallet } from '@defichain/jellyfish-api-core'
import { getNewAddress } from '@defichain/testing'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let controller: MempoolController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
  await client.wallet.setWalletFlag(wallet.WalletFlag.AVOID_REUSE)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    controllers: [MempoolController],
    providers: [{ provide: JsonRpcClient, useValue: client }]
  }).compile()
  controller = app.get<MempoolController>(MempoolController)
})

describe('controller.list()', () => {
  it('should list all transaction ids', async () => {
    const txid1 = await client.wallet.sendToAddress(await getNewAddress(container), 0.00001)
    const txid2 = await client.wallet.sendToAddress(await getNewAddress(container), 0.00002)

    const data = await controller.list()

    expect(data.length).toStrictEqual(2)
    expect(data[0]).toStrictEqual(txid1)
    expect(data[1]).toStrictEqual(txid2)
  })
})

describe('controller.get()', () => {
  it('should return mempool info with transaction id as param', async () => {
    const txid = await client.wallet.sendToAddress(await getNewAddress(container), 0.00001)

    const data = await controller.get(txid)

    expect(data.fees.base instanceof BigNumber).toStrictEqual(true)
    expect(data.fees.modified instanceof BigNumber).toStrictEqual(true)
    expect(data.fees.ancestor instanceof BigNumber).toStrictEqual(true)
    expect(data.fees.descendant instanceof BigNumber).toStrictEqual(true)
    expect(data.fees.base.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.fees.modified.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.fees.ancestor.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.fees.descendant.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

    expect(data.fee instanceof BigNumber).toStrictEqual(true)
    expect(data.fee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.modifiedfee instanceof BigNumber).toStrictEqual(true)
    expect(data.modifiedfee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

    expect(data.vsize instanceof BigNumber).toStrictEqual(true)
    expect(data.weight instanceof BigNumber).toStrictEqual(true)
    expect(data.height instanceof BigNumber).toStrictEqual(true)
    expect(data.time instanceof BigNumber).toStrictEqual(true)
    expect(data.vsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.weight.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.height.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.time.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

    expect(typeof data.wtxid).toStrictEqual('string')
    expect(data.depends.length >= 0).toStrictEqual(true)
    expect(data.spentby.length >= 0).toStrictEqual(true)
    expect(data['bip125-replaceable']).toStrictEqual(false)

    expect(data.descendant.count instanceof BigNumber).toStrictEqual(true)
    expect(data.descendant.size instanceof BigNumber).toStrictEqual(true)
    expect(data.descendant.fees instanceof BigNumber).toStrictEqual(true)
    expect(data.descendant.count.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.descendant.size.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.descendant.fees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

    expect(data.ancestor.count instanceof BigNumber).toStrictEqual(true)
    expect(data.ancestor.size instanceof BigNumber).toStrictEqual(true)
    expect(data.ancestor.fees instanceof BigNumber).toStrictEqual(true)
    expect(data.ancestor.count.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.ancestor.size.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    expect(data.ancestor.fees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
  })
})

describe('controller.get() for transaction id which is not found', () => {
  it('should fail with id as param', async () => {
    await expect(controller.get('0000000000000000000000000000000000000000000000000000000000000000')).rejects.toThrow(NotFoundException)
    await expect(controller.get('0000000000000000000000000000000000000000000000000000000000000000')).rejects.toThrow('Unable to find mempool transaction')
  })
})
