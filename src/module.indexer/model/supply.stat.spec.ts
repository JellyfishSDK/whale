// Notes: this is e2e test case, each (some) `it` cannot be ran individually
// requires the indexed data pile up since genesis

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { SupplyStatMapper } from '@src/module.model/supply.stat'
import { SupplyStatAggregationMapper } from '@src/module.model/supply.stat.aggregation'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasternodeTimeLock } from '@defichain/jellyfish-api-core/dist/category/masternode'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient
let app: NestFastifyApplication
let supplyStatMapper: SupplyStatMapper
let supplyStatAggregationMapper: SupplyStatAggregationMapper

beforeAll(async () => {
  await container.start()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
  app = await createTestingApp(container)

  supplyStatMapper = app.get(SupplyStatMapper)
  supplyStatAggregationMapper = app.get(SupplyStatAggregationMapper)

  {
    const empty = await supplyStatMapper.query(Number.MAX_SAFE_INTEGER)
    expect(empty.length).toStrictEqual(0)
  }

  {
    const empty = await supplyStatAggregationMapper.query(Number.MAX_SAFE_INTEGER)
    expect(empty.length).toStrictEqual(0)
  }
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

it('should index block 0', async () => {
  await waitForIndexedHeight(app, 0)

  const genesisStat = await supplyStatMapper.query(Number.MAX_SAFE_INTEGER)
  expect(genesisStat.length).toStrictEqual(1)
  expect(genesisStat[0].id).toStrictEqual('00000000')
  expect(genesisStat[0].circulating).toStrictEqual(591000030)
  expect(genesisStat[0].burned).toStrictEqual(0)
  expect(genesisStat[0].locked).toStrictEqual(0)
  expect(genesisStat[0].total).toStrictEqual(591000030)
  expect(genesisStat[0].block).toBeDefined()
  expect(genesisStat[0].block.height).toStrictEqual(0)

  const aggregated = await supplyStatAggregationMapper.query(Number.MAX_SAFE_INTEGER)
  expect(aggregated.length).toStrictEqual(1)
  expect(aggregated[0].id).toStrictEqual('00000000')
  expect(aggregated[0].circulating).toStrictEqual(591000030)
  expect(aggregated[0].burned).toStrictEqual(0)
  expect(aggregated[0].locked).toStrictEqual(0)
  expect(aggregated[0].total).toStrictEqual(591000030)
  expect(aggregated[0].block).toBeDefined()
  expect(aggregated[0].block.height).toStrictEqual(0)
})

it('should index block 1 - 2', async () => {
  await container.waitForBlockHeight(3)
  await waitForIndexedHeight(app, 2)

  const stats = await supplyStatMapper.query(3, HexEncoder.encodeHeight(3))
  expect(stats.length).toStrictEqual(3)
  const [statSecond, statFirst, statZeroth] = stats
  expect(statSecond.id).toStrictEqual('00000002')
  expect(statSecond.circulating).toStrictEqual(200) // this block emission in circulation
  expect(statSecond.burned).toStrictEqual(0)
  expect(statSecond.locked).toStrictEqual(0)
  expect(statSecond.total).toStrictEqual(200) // this block emission
  expect(statSecond.block).toBeDefined()
  expect(statSecond.block.height).toStrictEqual(2)

  expect(statFirst.id).toStrictEqual('00000001')
  expect(statFirst.circulating).toStrictEqual(200) // this block emission in circulation
  expect(statFirst.burned).toStrictEqual(0)
  expect(statFirst.locked).toStrictEqual(0)
  expect(statFirst.total).toStrictEqual(200) // this block emission
  expect(statFirst.block).toBeDefined()
  expect(statFirst.block.height).toStrictEqual(1)

  // same as `should index block 0` result
  expect(statZeroth.block.height).toStrictEqual(0)

  const aggregated = await supplyStatAggregationMapper.query(3, HexEncoder.encodeHeight(3))
  expect(aggregated.length).toStrictEqual(3)
  const [aggSecond, aggFirst, aggZeroth] = aggregated
  expect(aggSecond.id).toStrictEqual('00000002')
  expect(aggSecond.circulating).toStrictEqual(591000030 + 400)
  expect(aggSecond.burned).toStrictEqual(0)
  expect(aggSecond.locked).toStrictEqual(0)
  expect(aggSecond.total).toStrictEqual(591000030 + 400)
  expect(aggSecond.block).toBeDefined()
  expect(aggSecond.block.height).toStrictEqual(2)

  expect(aggFirst.id).toStrictEqual('00000001')
  expect(aggFirst.circulating).toStrictEqual(591000030 + 200)
  expect(aggFirst.burned).toStrictEqual(0)
  expect(aggFirst.locked).toStrictEqual(0)
  expect(aggFirst.total).toStrictEqual(591000030 + 200)
  expect(aggFirst.block).toBeDefined()
  expect(aggFirst.block.height).toStrictEqual(1)

  // same as `should index block 0` result
  expect(aggZeroth.block.height).toStrictEqual(0)
})

it('should index block 50 - post Eunos subsidy calculation', async () => {
  await container.waitForBlockHeight(51)
  await waitForIndexedHeight(app, 50)

  {
    const stats = await supplyStatMapper.query(2, HexEncoder.encodeHeight(51))
    expect(stats.length).toStrictEqual(2)
    const [eunos, preEunos] = stats
    expect(eunos.id).toStrictEqual('00000032')
    expect(eunos.circulating).toStrictEqual(405.04) // this block emission in circulation
    expect(eunos.burned).toStrictEqual(0)
    expect(eunos.locked).toStrictEqual(0)
    expect(eunos.total).toStrictEqual(405.04) // this block emission
    expect(eunos.block).toBeDefined()
    expect(eunos.block.height).toStrictEqual(50)

    expect(preEunos.id).toStrictEqual('00000031')
    expect(preEunos.circulating).toStrictEqual(200) // this block emission in circulation
    expect(preEunos.burned).toStrictEqual(0)
    expect(preEunos.locked).toStrictEqual(0)
    expect(preEunos.total).toStrictEqual(200) // this block emission
    expect(preEunos.block).toBeDefined()
    expect(preEunos.block.height).toStrictEqual(49)
  }

  {
    const aggregated = await supplyStatAggregationMapper.query(2, HexEncoder.encodeHeight(51))
    expect(aggregated.length).toStrictEqual(2)
    const [eunos, preEunos] = aggregated
    expect(eunos.id).toStrictEqual('00000032')
    expect(eunos.circulating).toStrictEqual(591000030 + 49 * 200 + 405.04) // this block emission in circulation
    expect(eunos.burned).toStrictEqual(0)
    expect(eunos.locked).toStrictEqual(0)
    expect(eunos.total).toStrictEqual(591000030 + 49 * 200 + 405.04) // this block emission
    expect(eunos.block).toBeDefined()
    expect(eunos.block.height).toStrictEqual(50)

    expect(preEunos.id).toStrictEqual('00000031')
    expect(preEunos.circulating).toStrictEqual(591000030 + 49 * 200) // this block emission in circulation
    expect(preEunos.burned).toStrictEqual(0)
    expect(preEunos.locked).toStrictEqual(0)
    expect(preEunos.total).toStrictEqual(591000030 + 49 * 200) // this block emission
    expect(preEunos.block).toBeDefined()
    expect(preEunos.block.height).toStrictEqual(49)
  }
})

it('should index block 55, 60 - post Eunos subsidy reduction', async () => {
  const reducedOnce = new BigNumber(405.04) // effectively 405.04 * 0.098342
    .minus(new BigNumber(405.04).times(0.01658))
    .dp(8)
  const reducedTwice = reducedOnce // effectively 405.04 * 0.098342 ^ 2
    .minus(reducedOnce.times(0.01658))
    .dp(8)

  // reduced once
  await container.waitForBlockHeight(56)
  await waitForIndexedHeight(app, 55)

  {
    // after first reduction
    const stats = await supplyStatMapper.query(2, HexEncoder.encodeHeight(56))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats
    expect(after.id).toStrictEqual('00000037')
    expect(after.circulating).toStrictEqual(reducedOnce.toNumber()) // reduced by 1.658%
    expect(after.burned).toStrictEqual(0)
    expect(after.locked).toStrictEqual(0)
    expect(after.total).toStrictEqual(reducedOnce.toNumber())
    expect(after.block).toBeDefined()
    expect(after.block.height).toStrictEqual(55)

    // before first reduction
    expect(before.id).toStrictEqual('00000036')
    expect(before.circulating).toStrictEqual(405.04)
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.total).toStrictEqual(405.04)
    expect(before.block).toBeDefined()
    expect(before.block.height).toStrictEqual(54)
  }

  {
    // after first reduction
    const stats = await supplyStatAggregationMapper.query(2, HexEncoder.encodeHeight(56))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats
    expect(after.id).toStrictEqual('00000037')
    expect(after.circulating).toStrictEqual(new BigNumber(591000030)
      .plus(new BigNumber(200).times(49))
      .plus(new BigNumber(405.04).times(5))
      .plus(reducedOnce)
      .toNumber()
    )
    expect(after.burned).toStrictEqual(0)
    expect(after.locked).toStrictEqual(0)
    expect(after.total).toStrictEqual(new BigNumber(591000030)
      .plus(new BigNumber(200).times(49))
      .plus(new BigNumber(405.04).times(5))
      .plus(reducedOnce)
      .toNumber()
    )
    expect(after.block).toBeDefined()
    expect(after.block.height).toStrictEqual(55)

    // before first reduction
    expect(before.id).toStrictEqual('00000036')
    expect(before.circulating).toStrictEqual(591000030 + 49 * 200 + 5 * 405.04)
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.total).toStrictEqual(591000030 + 49 * 200 + 5 * 405.04)
    expect(before.block).toBeDefined()
    expect(before.block.height).toStrictEqual(54)
  }

  // reduced twice
  await container.waitForBlockHeight(61)
  await waitForIndexedHeight(app, 60)

  {
    // after second reduction
    const stats = await supplyStatMapper.query(2, HexEncoder.encodeHeight(61))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats
    expect(after.id).toStrictEqual('0000003c')
    expect(after.circulating).toStrictEqual(reducedTwice.toNumber())
    expect(after.burned).toStrictEqual(0)
    expect(after.locked).toStrictEqual(0)
    expect(after.total).toStrictEqual(reducedTwice.toNumber())
    expect(after.block).toBeDefined()
    expect(after.block.height).toStrictEqual(60)

    // before second reduction
    expect(before.id).toStrictEqual('0000003b')
    expect(before.circulating).toStrictEqual(reducedOnce.toNumber())
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.total).toStrictEqual(reducedOnce.toNumber())
    expect(before.block).toBeDefined()
    expect(before.block.height).toStrictEqual(59)
  }

  {
    // after second reduction
    const stats = await supplyStatAggregationMapper.query(2, HexEncoder.encodeHeight(61))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats
    expect(after.id).toStrictEqual('0000003c')
    expect(after.circulating).toStrictEqual(new BigNumber(591000030)
      .plus(new BigNumber(200).times(49))
      .plus(new BigNumber(405.04).times(5))
      .plus(new BigNumber(reducedOnce).times(5))
      .plus(reducedTwice)
      .toNumber()
    )
    expect(after.burned).toStrictEqual(0)
    expect(after.locked).toStrictEqual(0)
    expect(after.total).toStrictEqual(new BigNumber(591000030)
      .plus(new BigNumber(200).times(49))
      .plus(new BigNumber(405.04).times(5))
      .plus(new BigNumber(reducedOnce).times(5))
      .plus(reducedTwice)
      .toNumber()
    )
    expect(after.block).toBeDefined()
    expect(after.block.height).toStrictEqual(60)

    // before second reduction
    expect(before.id).toStrictEqual('0000003b')
    expect(before.circulating).toStrictEqual(new BigNumber(591000030)
      .plus(new BigNumber(200).times(49))
      .plus(new BigNumber(405.04).times(5))
      .plus(new BigNumber(reducedOnce).times(5))
      .toNumber()
    )
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.total).toStrictEqual(new BigNumber(591000030)
      .plus(new BigNumber(200).times(49))
      .plus(new BigNumber(405.04).times(5))
      .plus(new BigNumber(reducedOnce).times(5))
      .toNumber()
    )
    expect(before.block).toBeDefined()
    expect(before.block.height).toStrictEqual(59)
  }
})

it('should account time locked masternode tvl under as `locked` instead of `circulating`', async () => {
  await container.waitForWalletCoinbaseMaturity() // height = 100

  // TODO:
  const owner = await container.getNewAddress()
  await client.masternode.createMasternode(owner)
  await client.masternode.createMasternode(await container.getNewAddress(), undefined, { timelock: MasternodeTimeLock.FIVE_YEAR, utxos: [] })
  await client.masternode.createMasternode(await container.getNewAddress(), undefined, { timelock: MasternodeTimeLock.TEN_YEAR, utxos: [] })

  await container.generate(3) // height = 103
  await waitForIndexedHeight(app, 102)

  { // single block
    const stats = await supplyStatAggregationMapper.query(2, HexEncoder.encodeHeight(103))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats

    expect(after.id).toStrictEqual('00000066')
    expect(after.burned).toStrictEqual(3) // 3 new MN, each burn 1 DFI as fee
    expect(after.locked).toStrictEqual(4) // 2 locked MN, each has 2 DFI collateral
    expect(after.block.height).toStrictEqual(102)

    expect(before.id).toStrictEqual('00000065')
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.block.height).toStrictEqual(101)
  }

  { // aggregated
    const stats = await supplyStatAggregationMapper.query(2, HexEncoder.encodeHeight(103))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats

    expect(after.id).toStrictEqual('00000066')
    expect(after.burned).toStrictEqual(3) // 3 new MN, each burn 1 DFI as fee
    expect(after.locked).toStrictEqual(4) // 2 locked MN, each has 2 DFI collateral
    expect(after.block.height).toStrictEqual(102)

    expect(before.id).toStrictEqual('00000065')
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.block.height).toStrictEqual(101)
  }
})

it('should account/consolidate burn history (other than masternode fee burn)', async () => {
  const burnAddress = 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG' // from ain

  await client.wallet.sendToAddress(burnAddress, 1.2)
  await container.generate(3) // height = 106

  // actual ain behavior, burn tx broadcasted into 104 mempool (103 minted)
  // history only appear on 105
  await waitForIndexedHeight(app, 105)

  { // single block
    const stats = await supplyStatMapper.query(2, HexEncoder.encodeHeight(106))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats

    expect(after.id).toStrictEqual('00000069')
    expect(after.burned).toStrictEqual(1.2)
    expect(after.locked).toStrictEqual(0)
    expect(after.block.height).toStrictEqual(105)

    expect(before.id).toStrictEqual('00000068')
    expect(before.burned).toStrictEqual(0)
    expect(before.locked).toStrictEqual(0)
    expect(before.block.height).toStrictEqual(104)
  }

  { // aggregated
    const stats = await supplyStatAggregationMapper.query(2, HexEncoder.encodeHeight(106))
    expect(stats.length).toStrictEqual(2)
    const [after, before] = stats

    expect(after.id).toStrictEqual('00000069')
    expect(after.burned).toStrictEqual(4.2) // 3 new MN fee + 1.2 manually burned
    expect(after.locked).toStrictEqual(4)
    expect(after.block.height).toStrictEqual(105)

    expect(before.id).toStrictEqual('00000068')
    expect(before.burned).toStrictEqual(3)
    expect(before.locked).toStrictEqual(4)
    expect(before.block.height).toStrictEqual(104)
  }
})
