import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
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

  async list (query: PaginationQuery): Promise<PoolPairInfoPlus[]> {
    const poolPairResult = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    const dfiUsdtConversionPrice = getDfiUsdtConversionPrice()

    return Object.entries(poolPairResult).map(([id, value]) => {
      return {
        ...value,
        id,
        totalLiquidityUsd: getTotalLiquidityUsd(value, dfiUsdtConversionPrice)
      }
    })
  }

  async get (id: string): Promise<PoolPairInfoPlus> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const dfiUsdtConversionPrice = getDfiUsdtConversionPrice()

    const totalLiquidityUsd = getTotalLiquidityUsd(info, dfiUsdtConversionPrice)

    return {
      ...info,
      id,
      totalLiquidityUsd
    }
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
  poolPairInfo: PoolPairInfo,
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
  if (tokenId === poolPairInfo.idTokenA) {
    reserveAUsd = poolPairInfo.reserveA.times(tokenToUsdt)
    reserveBUsd = poolPairInfo.reserveB.times(dfiToUsdt)
  } else {
    reserveAUsd = poolPairInfo.reserveA.times(dfiToUsdt)
    reserveBUsd = poolPairInfo.reserveB.times(tokenToUsdt)
  }

  // reserveA_USD (eg: BTC) = reserveA * tokenToUsdt
  // reserveB_USD (eg: DFI) = reserveB * dfiToUsdt
  // totalLiquidity_USD = reserveA_USD + reserveB_USD
  return reserveAUsd.plus(reserveBUsd)
}

export interface PoolPairInfoPlus {
  id: string
  symbol: string
  name: string
  status: string
  idTokenA: string
  idTokenB: string
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  totalLiquidityUsd: BigNumber
  'reserveA/reserveB': BigNumber | string
  'reserveB/reserveA': BigNumber | string
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards: BigNumber
  creationTx: string
  creationHeight: BigNumber
}
