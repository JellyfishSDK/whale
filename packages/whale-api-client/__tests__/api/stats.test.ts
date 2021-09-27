import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import BigNumber from 'bignumber.js'

describe('stats', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    client = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    await createToken(container, 'A')
    await mintTokens(container, 'A')
    await createToken(container, 'B')
    await mintTokens(container, 'B')

    await createPoolPair(container, 'A', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await createPoolPair(container, 'B', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await createToken(container, 'USDT')
    await createPoolPair(container, 'USDT', 'DFI')
    await mintTokens(container, 'USDT')
    await addPoolLiquidity(container, {
      tokenA: 'USDT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 431.51288,
      shareAddress: await getNewAddress(container)
    })
    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })
  const consensusParams = {
    emissionReductionPeriod: 32690,
    eunosHeight: 10000000
  }

  function getBlockSubsidy (eunosHeight: number, nHeight: number = 0): number {
    let blockSubsidy = 405.04
    const emissionReductionPeriod = 32690 // Two weeks
    const emissionReductionAmount = new BigNumber(0.01658) // 1.658%
    const reductions = Math.floor((nHeight - eunosHeight) / emissionReductionPeriod)

    if (nHeight >= eunosHeight) {
      for (let i = reductions; i > 0; i--) {
        const reductionAmount = emissionReductionAmount.times(blockSubsidy)
        if (reductionAmount.lte(0.00001)) {
          blockSubsidy = 0
          break
        }
        blockSubsidy -= reductionAmount.toNumber()
      }
    }
    return blockSubsidy
  }

  function calculateCoinbaseRewards (blockReward: number, percentage: number): number {
    return (blockReward * percentage) / 10000
  }

  function calculateReductionHeight (reductions: number): number {
    return consensusParams.eunosHeight + reductions * consensusParams.emissionReductionPeriod
  }

  it('should get stat data', async () => {
    const data = await client.stats.get()
    expect(data).toStrictEqual({
      count: { blocks: 117, prices: 0, tokens: 7, masternodes: 8 },
      burned: { address: 0, emission: 7014.88, fee: 3, total: 7017.88 },
      tvl: { dex: 3853.9423279032194, total: 4039.3365615032194, masternodes: 185.3942336 },
      price: { usdt: 2.31742792 },
      masternodes: {
        locked: [
          {
            count: 8,
            tvl: 185.3942336,
            weeks: 0
          }
        ]
      },
      emission: {
        total: 405.04,
        anchor: 0.081008,
        dex: 99.03228,
        community: 19.887464,
        masternode: 134.999832,
        burned: 7017.88
      }
    })
  })

  it('should check emission with reduction 0', async () => {
    const blockSubsidy = getBlockSubsidy(consensusParams.eunosHeight, calculateReductionHeight(0))
    expect(blockSubsidy).toStrictEqual(405.04)

    // masternode
    expect(calculateCoinbaseRewards(blockSubsidy, 3333)
      .toFixed(5)).toStrictEqual('134.99983')

    // anchors
    expect(calculateCoinbaseRewards(blockSubsidy, 2).toFixed(5))
      .toStrictEqual('0.08101')

    // dex
    expect(calculateCoinbaseRewards(blockSubsidy, 2445)
      .toFixed(5)).toStrictEqual('99.03228')

    // community
    expect(calculateCoinbaseRewards(blockSubsidy, 491)
      .toFixed(5)).toStrictEqual('19.88746')
  })

  it('should check emission with reduction 1', async () => {
    const blockSubsidy = getBlockSubsidy(consensusParams.eunosHeight, calculateReductionHeight(1))
    expect(blockSubsidy).toStrictEqual(398.3244368)

    // masternode
    expect(calculateCoinbaseRewards(blockSubsidy, 3333)
      .toFixed(5)).toStrictEqual('132.76153')

    // anchors
    expect(calculateCoinbaseRewards(blockSubsidy, 2).toFixed(5))
      .toStrictEqual('0.07966')

    // dex
    expect(calculateCoinbaseRewards(blockSubsidy, 2445)
      .toFixed(5)).toStrictEqual('97.39032')

    // community
    expect(calculateCoinbaseRewards(blockSubsidy, 491)
      .toFixed(5)).toStrictEqual('19.55773')
  })
})
