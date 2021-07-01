import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Injectable()
export class PoolPairService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache
  ) {
  }

  async list (query: PaginationQuery): Promise<PoolPairData[]> {
    const poolPairResult = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const poolPairsData = Object.entries(poolPairResult).map(([id, value]) => {
      return mapPoolPair(id, value)
    }).sort(a => Number.parseInt(a.id))

    const dfiUsdtConversionPrice = getDfiUsdtConversionPrice()

    for (let i = 0; i < poolPairsData.length; i += 1) {
      const poolPairData: PoolPairData = poolPairsData[i]

      poolPairData.totalLiquidityUsd = getTotalLiquidityUsd(poolPairData, dfiUsdtConversionPrice)
    }

    return poolPairsData
  }

  async get (id: string): Promise<PoolPairData> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const poolPairData = mapPoolPair(String(id), info)

    const dfiUsdtConversionPrice = getDfiUsdtConversionPrice()

    poolPairData.totalLiquidityUsd = getTotalLiquidityUsd(poolPairData, dfiUsdtConversionPrice)

    return poolPairData
  }
}

function getDfiUsdtConversionPrice (): Record<string, BigNumber> {
  // const fromAddress = await this.rpcClient.wallet.getNewAddress()
  // const toAddress = await this.rpcClient.wallet.getNewAddress()
  // const usdtToDfi = await this.rpcClient.poolpair.testPoolSwap({
  //  from: tokenAddress, tokenFrom: 'USDT, amount: 1, to: toAddress, tokenTo: 'DFI'
  // })
  // const usdtToDfi = new BigNumber(usdtToDfi.split('@')[0])
  // TODO(canonbrother): use testpoolswap
  const usdtToDfi = new BigNumber('0.43151288')
  const dfiToUsdt = new BigNumber('2.29699751')

  return {
    usdtToDfi,
    dfiToUsdt
  }
}

function getTotalLiquidityUsd (
  poolPairData: PoolPairData,
  dfiUsdtConversionPrice: Record<string, BigNumber>
): BigNumber {
  const { usdtToDfi, dfiToUsdt } = dfiUsdtConversionPrice

  // const poolPairSymbols = poolPairData.symbol.split('-')
  // const symbolA = poolPairSymbols[0]
  // const symbolB = poolPairSymbols[1]
  // TODO(canonbrother): guess should have other DFI alternatives
  // const tokenSymbol = symbolA !== 'DFI' ? symbolB : symbolA
  // const swapped = await this.rpcClient.poolpair.testPoolSwap({
  //   from: fromAddress, tokenFrom: tokenSymbol, amountFrom: 1, to: toAddress, tokenTo: 'DFI',
  // })
  // TODO(canonbrother): use testpoolswap
  const swappedAccount = '14.23530023@tokenId'
  const swappedData = swappedAccount.split('@')
  const tokenToDfi = new BigNumber(swappedData[0])
  const tokenId = swappedData[1]

  const tokenToUsdt = usdtToDfi.div(tokenToDfi)

  let reserveAUsd: BigNumber
  let reserveBUsd: BigNumber

  // check which poolPairInfo.idToken{A/B} is token (eg: ETH)
  if (tokenId === poolPairData.tokenA.id) {
    reserveAUsd = poolPairData.tokenA.reserve.times(tokenToUsdt)
    reserveBUsd = poolPairData.tokenB.reserve.times(dfiToUsdt)
  } else {
    reserveAUsd = poolPairData.tokenA.reserve.times(dfiToUsdt)
    reserveBUsd = poolPairData.tokenB.reserve.times(tokenToUsdt)
  }

  // reserveA_USD (eg: BTC) = reserveA * tokenToUsdt
  // reserveB_USD (eg: DFI) = reserveB * dfiToUsdt
  // totalLiquidity_USD = reserveA_USD + reserveB_USD
  return reserveAUsd.plus(reserveBUsd)
}

function mapPoolPair (id: string, poolPairInfo: PoolPairInfo): PoolPairData {
  return {
    id,
    symbol: poolPairInfo.symbol,
    name: poolPairInfo.name,
    status: poolPairInfo.status,
    tokenA: {
      id: poolPairInfo.idTokenA,
      reserve: poolPairInfo.reserveA,
      blockCommission: poolPairInfo.blockCommissionA
    },
    tokenB: {
      id: poolPairInfo.idTokenB,
      reserve: poolPairInfo.reserveB,
      blockCommission: poolPairInfo.blockCommissionB
    },
    priceRatio: {
      'tokenA/tokenB': poolPairInfo['reserveA/reserveB'],
      'tokenB/tokenA': poolPairInfo['reserveB/reserveA']
    },
    commission: poolPairInfo.commission,
    totalLiquidity: poolPairInfo.totalLiquidity,
    totalLiquidityUsd: new BigNumber(0),
    tradeEnabled: poolPairInfo.tradeEnabled,
    ownerAddress: poolPairInfo.ownerAddress,
    rewardPct: poolPairInfo.rewardPct,
    customRewards: poolPairInfo.customRewards,
    creation: {
      tx: poolPairInfo.creationTx,
      height: poolPairInfo.creationHeight.toNumber()
    }
  }
}
