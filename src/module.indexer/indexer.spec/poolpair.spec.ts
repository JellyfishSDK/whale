import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { createPoolPair, createToken } from '@defichain/testing'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let mapper: PoolPairMapper
let spy: jest.SpyInstance

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(10)

  app = await createIndexerTestModule(container)
  await app.init()

  mapper = app.get<PoolPairMapper>(PoolPairMapper)

  await setup()
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
