import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { TokenData } from '../../src/api/tokens'
import { MempoolTxData } from '../../src/api/mempool'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('client.mempool.list()', () => {
  it('should listMempool', async () => {
    // const txid1 = await client.wallet.sendToAddress(await getNewAddress(container), 0.00001)
    // const txid2 = await client.wallet.sendToAddress(await getNewAddress(container), 0.00001)
    //
    // const data = await client.mempool.list()
    // console.log(data)
    //
    // expect(data.length).toStrictEqual(2)
    // expect(data[0]).toStrictEqual(txid1)
    // expect(data[1]).toStrictEqual(txid2)
  })
})

describe('client.mempool.get()', () => {
  it('should return mempool info with transaction id as param', async () => {
    //  const txid = await client.wallet.sendToAddress(await getNewAddress(container), 0.00001)
    //
    // const data = await client.mempool.get(txid)
    // expect(data.fees.base instanceof BigNumber).toStrictEqual(true)
    // expect(data.fees.modified instanceof BigNumber).toStrictEqual(true)
    // expect(data.fees.ancestor instanceof BigNumber).toStrictEqual(true)
    // expect(data.fees.descendant instanceof BigNumber).toStrictEqual(true)
    // expect(data.fees.base.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.fees.modified.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.fees.ancestor.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.fees.descendant.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    //
    // expect(data.fee instanceof BigNumber).toStrictEqual(true)
    // expect(data.fee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.modifiedfee instanceof BigNumber).toStrictEqual(true)
    // expect(data.modifiedfee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    //
    // expect(data.vsize instanceof BigNumber).toStrictEqual(true)
    // expect(data.weight instanceof BigNumber).toStrictEqual(true)
    // expect(data.height instanceof BigNumber).toStrictEqual(true)
    // expect(data.time instanceof BigNumber).toStrictEqual(true)
    // expect(data.vsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.weight.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.height.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.time.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    //
    // expect(typeof data.wtxid).toStrictEqual('string')
    // expect(data.depends.length >= 0).toStrictEqual(true)
    // expect(data.spentby.length >= 0).toStrictEqual(true)
    // expect(data['bip125-replaceable']).toStrictEqual(false)
    //
    // expect(data.descendant.count instanceof BigNumber).toStrictEqual(true)
    // expect(data.descendant.size instanceof BigNumber).toStrictEqual(true)
    // expect(data.descendant.fees instanceof BigNumber).toStrictEqual(true)
    // expect(data.descendant.count.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.descendant.size.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.descendant.fees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    //
    // expect(data.ancestor.count instanceof BigNumber).toStrictEqual(true)
    // expect(data.ancestor.size instanceof BigNumber).toStrictEqual(true)
    // expect(data.ancestor.fees instanceof BigNumber).toStrictEqual(true)
    // expect(data.ancestor.count.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.ancestor.size.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
    // expect(data.ancestor.fees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
  })

  it('should fail due to id is not found', async () => {
    const call = async (): Promise<MempoolTxData> => await client.mempool.get('0000000000000000000000000000000000000000000000000000000000000000')
    await expect(call).rejects
      .toThrow('404 - NotFound (/v1/regtest/mempool/0000000000000000000000000000000000000000000000000000000000000000): Unable to find mempool transaction')
  })

  it('should fail due to id is malformed', async () => {
    const call = async (): Promise<TokenData> => await client.tokens.get('$*@')
    await expect(call).rejects
      .toThrow('400 - BadRequest (/v1/regtest/tokens/$*@): Validation failed (numeric string is expected)')
  })
})
