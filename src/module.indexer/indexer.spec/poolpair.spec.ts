import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { TokenMapper } from '@src/module.model/token'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import crypto from 'crypto'

const container = new MasterNodeRegTestContainer()
let app: TestingModule
let client: JsonRpcClient
let mapper: PoolPairMapper
let tokenMapper: TokenMapper
let spy: jest.SpyInstance

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()

  client = app.get<JsonRpcClient>(JsonRpcClient)

  mapper = app.get<PoolPairMapper>(PoolPairMapper)
  tokenMapper = app.get<TokenMapper>(TokenMapper)

  await setup()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

beforeEach(async () => {
  // Note(canonbrother): to prevent index got invalidated as mocking 'client.blockchain.getBlock' will never get the best chain
  spy = jest.spyOn(mapper, 'delete').mockImplementation()
  spy = jest.spyOn(tokenMapper, 'delete').mockImplementation()

  spy = jest.spyOn(client.blockchain, 'getBlock')
    .mockImplementationOnce(() => generateBlock(dummyScripts[0], 16))
    .mockImplementationOnce(() => generateBlock(dummyScripts[1], 17))
    .mockImplementationOnce(() => generateBlock(dummyScripts[2], 18))
    .mockImplementationOnce(() => generateBlock(dummyScripts[3], 19))
})

afterEach(() => {
  spy.mockRestore()
})

async function putToken (id: string, symbol: string): Promise<void> {
  await tokenMapper.put({
    id: id,
    block: {
      hash: crypto.randomBytes(32).toString('hex'),
      height: Number(id)
    },
    symbol: symbol,
    name: symbol,
    decimal: 8,
    limit: new BigNumber('0'),
    mintable: true,
    tradeable: true,
    isDAT: true
  })
}

async function setup (): Promise<void> {
  await putToken('0', 'DFI')
  await putToken('1', 'ETH')
  await putToken('2', 'BTC')
  await putToken('3', 'USDT')
  await putToken('4', 'BNB')
  await putToken('5', 'ADA')
  await putToken('6', 'DOGE')
  await putToken('7', 'XRP')
  await putToken('8', 'USDC')
  await putToken('9', 'DOT')
  await putToken('10', 'UNI')
  await putToken('11', 'BUSD')
  await putToken('12', 'BCH')
  await putToken('13', 'LTC')
  await putToken('14', 'SOL')
  await putToken('15', 'LINK')
}

const dummyScripts = [
  {
    // regtest - createPoolPair
    asm: 'OP_RETURN 4466547870010080841e000000000017a914cadb8f9af3e68326c1ab41fb3761d455178c6d2b87010000',
    hex: '6a2a4466547870010080841e000000000017a914cadb8f9af3e68326c1ab41fb3761d455178c6d2b87010000'
  },
  {
    // https://mainnet.defichain.io/#/DFI/mainnet/tx/9e0c956f9c626c07ba3dd742748ff9872b5688a976d66d35aa09418f18620b64
    asm: 'OP_RETURN 44665478700700400d03000000000017a914f78ca7530bd35fff6af98a49522a34f7508ab64e87010000',
    hex: '6a2a44665478700700400d03000000000017a914f78ca7530bd35fff6af98a49522a34f7508ab64e87010000'
  },
  {
    // https://mainnet.defichain.io/#/DFI/mainnet/tx/75a25a52c54d12f84d4a553be354fa2c5651689d8f9f4860aad8b68c804af3f1
    asm: 'OP_RETURN 44665478700900400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac010000',
    hex: '6a2c44665478700900400d0300000000001976a9148f83f4f005ba70f0c5d7a59d4696daee13a6e43b88ac010000'
  },
  {
    // regtest - updatePoolPair
    asm: 'OP_RETURN 44665478751000000000c0e1e400000000000000',
    hex: '6a1444665478751000000000c0e1e400000000000000'
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

it('should query at block 0', async () => {
  await waitForHeight(app, 0)

  const poolpairs = await mapper.query(100)
  const last = poolpairs.length - 1

  expect(poolpairs[last].id).toStrictEqual('1-0')
  expect(poolpairs[last].poolId).toStrictEqual('16')
  expect(poolpairs[last].symbol).toStrictEqual('ETH-DFI')
  expect(poolpairs[last].status).toStrictEqual(true)
  expect(poolpairs[last].commission).toStrictEqual('0.02')
  expect(poolpairs[last].block.hash).toStrictEqual(expect.any(String))
  expect(poolpairs[last].block.height).toStrictEqual(16)
  expect(poolpairs[last].tokenA).toStrictEqual('1')
  expect(poolpairs[last].tokenB).toStrictEqual('0')
})

// Block 15 should be already generated UpdatePoolPair block
it('should query at block 20', async () => {
  await waitForHeight(app, 20)

  const poolpairs = await mapper.query(100)
  const last = poolpairs.length - 1

  expect(poolpairs[last].id).toStrictEqual('1-0')
  expect(poolpairs[last].poolId).toStrictEqual('16')
  expect(poolpairs[last].symbol).toStrictEqual('ETH-DFI')
  expect(poolpairs[last].status).toStrictEqual(false)
  expect(poolpairs[last].commission).toStrictEqual('0.15')
  expect(poolpairs[last].block.hash).toStrictEqual(expect.any(String))
  expect(poolpairs[last].block.height).toStrictEqual(16)
  expect(poolpairs[last].tokenA).toStrictEqual('1')
  expect(poolpairs[last].tokenB).toStrictEqual('0')
})
