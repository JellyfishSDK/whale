import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { createPoolPair, createToken } from '@defichain/testing'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairIndexer } from '@src/module.indexer/model/poolpair'
import crypto from 'crypto'
import BigNumber from 'bignumber.js'
import { RpcItemLengthError, RpcNotFoundIndexerError } from '../error'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let client: JsonRpcClient
let mapper: PoolPairMapper
let indexer: PoolPairIndexer
let spy: jest.SpyInstance

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(10)

  app = await createIndexerTestModule(container)
  await app.init()

  client = app.get<JsonRpcClient>(JsonRpcClient)
  mapper = app.get<PoolPairMapper>(PoolPairMapper)

  await setup()

  indexer = new PoolPairIndexer(mapper, client)
})

beforeEach(async () => {
  // Note(canonbrother): to prevent index got invalidated as mocking 'client.blockchain.getBlock' will never get the best chain
  spy = jest.spyOn(mapper, 'delete').mockImplementation()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

afterEach(async () => {
  spy.mockRestore()
})

async function setup (): Promise<void> {
  await createToken(container, 'ETH')
  await createToken(container, 'BTC')
  await createToken(container, 'USDT')
  await createPoolPair(container, 'ETH', 'DFI') // height 104
  await createPoolPair(container, 'BTC', 'DFI')
  await createPoolPair(container, 'USDT', 'DFI')
  await createToken(container, 'DOGE')
  await createPoolPair(container, 'DOGE', 'DFI')

  await updatePoolPair(container, { pool: 'ETH-DFI', status: false, commission: 0.02 }) // height 109
  await updatePoolPair(container, { pool: 'ETH-DFI', status: true, commission: 0.015 }) // height 110
  await updatePoolPair(container, { pool: 'ETH-DFI', status: true, commission: 0.03 }) // height 111
}

// TODO(canonbrother): add updatePoolPair rpc jellyfish core and testing
async function updatePoolPair (container: MasterNodeRegTestContainer, metadata: any): Promise<void> {
  await container.call('updatepoolpair', [{
    pool: metadata.pool,
    status: metadata.status,
    commission: metadata.commission
  }])

  await container.generate(1)
}

const dummyScripts = [
  {
    // regtest - createPoolPair
    asm: 'OP_RETURN 4466547870010080841e000000000017a914cadb8f9af3e68326c1ab41fb3761d455178c6d2b87010000',
    hex: '6a2a4466547870010080841e000000000017a914cadb8f9af3e68326c1ab41fb3761d455178c6d2b87010000'
  }
]

function generateBlock (dummyScript: any, height: number): any {
  return {
    hash: crypto.randomBytes(32).toString('hex'),
    height: height,
    tx: [{
      txid: crypto.randomBytes(32).toString('hex'),
      vin: [],
      vout: [{
        scriptPubKey: dummyScript,
        n: 0,
        value: new BigNumber('26.78348323')
      }]
    }],
    time: 1625547853
  }
}

it('should query at block 110', async () => {
  await waitForHeight(app, 110)

  const poolpairs = await mapper.query('1-0', 100)
  expect(poolpairs.length).toStrictEqual(4)

  expect(poolpairs[0].id).toStrictEqual('1-0-111')
  expect(poolpairs[0].poolId).toStrictEqual('4')
  expect(poolpairs[0].symbol).toStrictEqual('ETH-DFI')
  expect(poolpairs[0].symbolId).toStrictEqual('1-0')
  expect(poolpairs[0].status).toStrictEqual(true)
  expect(poolpairs[0].commission).toStrictEqual('0.03')
  expect(poolpairs[0].block.hash).toStrictEqual(expect.any(String))
  expect(poolpairs[0].block.height).toStrictEqual(111)

  expect(poolpairs[1].id).toStrictEqual('1-0-110')
  expect(poolpairs[1].status).toStrictEqual(true)
  expect(poolpairs[1].commission).toStrictEqual('0.015')
  expect(poolpairs[1].block.height).toStrictEqual(110)

  expect(poolpairs[2].id).toStrictEqual('1-0-109')
  expect(poolpairs[2].status).toStrictEqual(false)
  expect(poolpairs[2].commission).toStrictEqual('0.02')
  expect(poolpairs[2].block.height).toStrictEqual(109)

  expect(poolpairs[3].id).toStrictEqual('1-0-104')
  expect(poolpairs[3].status).toStrictEqual(true)
  expect(poolpairs[3].commission).toStrictEqual('0')
  expect(poolpairs[3].block.height).toStrictEqual(104)

  const latest = await mapper.getLatest('1-0')
  expect(latest?.id).toStrictEqual('1-0-111')
})

it('should throw RpcNotFoundIndexerError', async () => {
  expect.assertions(2)

  const cSpy = jest.spyOn(client.token, 'getToken').mockImplementation()

  try {
    await indexer.index(generateBlock(dummyScripts[0], 112))
  } catch (err) {
    expect(err).toBeInstanceOf(RpcNotFoundIndexerError)
    expect(err.message).toStrictEqual('module.indexer: not found data from rpc getToken 1')
  }

  cSpy.mockRestore()
})

it('should throw RpcItemLengthError', async () => {
  expect.assertions(2)

  const cSpy = jest.spyOn(client.poolpair, 'getPoolPair').mockResolvedValue({
    0: {
      symbol: '',
      name: '',
      status: '',
      idTokenA: '',
      idTokenB: '',
      reserveA: new BigNumber(0),
      reserveB: new BigNumber(0),
      commission: new BigNumber(0),
      totalLiquidity: new BigNumber(0),
      'reserveA/reserveB': '',
      'reserveB/reserveA': '',
      tradeEnabled: true,
      ownerAddress: '',
      blockCommissionA: new BigNumber(0),
      blockCommissionB: new BigNumber(0),
      rewardPct: new BigNumber(0),
      customRewards: [''],
      creationTx: '',
      creationHeight: new BigNumber(0)
    },
    1: {
      symbol: '',
      name: '',
      status: '',
      idTokenA: '',
      idTokenB: '',
      reserveA: new BigNumber(0),
      reserveB: new BigNumber(0),
      commission: new BigNumber(0),
      totalLiquidity: new BigNumber(0),
      'reserveA/reserveB': '',
      'reserveB/reserveA': '',
      tradeEnabled: true,
      ownerAddress: '',
      blockCommissionA: new BigNumber(0),
      blockCommissionB: new BigNumber(0),
      rewardPct: new BigNumber(0),
      customRewards: [''],
      creationTx: '',
      creationHeight: new BigNumber(0)
    }
  })

  try {
    await indexer.index(generateBlock(dummyScripts[0], 112))
  } catch (err) {
    console.log('err: ', err)
    expect(err).toBeInstanceOf(RpcItemLengthError)
    expect(err.message).toStrictEqual('module.indexer: the poolpair length is not valid')
  }

  cSpy.mockRestore()
})
