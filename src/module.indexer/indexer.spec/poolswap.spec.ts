import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { PoolSwapAggregationMapper } from '@src/module.model/poolswap.aggregation'
import { createPoolPair, createToken, addPoolLiquidity, poolSwap, getNewAddress, mintTokens } from '@defichain/testing'
import { getDateInString } from '@src/utils'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()

  app = await createIndexerTestModule(container)
  await app.init()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

async function genPoolSwapTx (
  symbol: string, liqAmtA: number, liqAmtB: number, swapAmt: number): Promise<void> {
  const tokenAddress = await getNewAddress(container)
  await createToken(container, symbol, { collateralAddress: tokenAddress })
  await createPoolPair(container, symbol, 'DFI')
  await mintTokens(container, symbol)
  await addPoolLiquidity(container, {
    tokenA: symbol,
    amountA: liqAmtA,
    tokenB: 'DFI',
    amountB: liqAmtB,
    shareAddress: await getNewAddress(container)
  })
  await poolSwap(container, {
    from: tokenAddress,
    tokenFrom: symbol,
    amountFrom: swapAmt,
    to: await getNewAddress(container),
    tokenTo: 'DFI'
  })
}

describe('', () => {
  // QUESTION(canonbrother): how can i test with mock time??
  it('should query by date range', async () => {
    // let dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => new Date(Date.UTC(2021, 5+1, 14)).valueOf())
    // jest.useFakeTimers('modern').setSystemTime(new Date(Date.UTC(2021, 5+1, 14)).valueOf());

    await genPoolSwapTx('CAT', 200, 40, 125.00023589)
    await genPoolSwapTx('DOG', 15, 30, 12.39008518)
    await genPoolSwapTx('ELF', 30, 15, 92.00012004)

    await waitForHeight(app, 120)

    const aggregationMapper = app.get(PoolSwapAggregationMapper)

    const from = getDateInString(2021, 0, 1)
    const to = getDateInString(2021, 8, 31)

    const aggregations = await aggregationMapper.query(100, from, to)
    expect(aggregations.length).toStrictEqual(1)
    for (const h in aggregations[0].bucket) {
      const bucket = aggregations[0].bucket[h]
      if (bucket.count !== 0) {
        expect(bucket.total).toStrictEqual('229.39044111')
        expect(bucket.count).toStrictEqual(3)
      }
    }
    // dateNowSpy.mockRestore()
  })
})
