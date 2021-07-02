import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import BigNumber from 'bignumber.js'
import { PoolPairInfo, TestPoolSwapMetadata } from '@defichain/jellyfish-api-core/dist/category/poolpair'

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

    const dfiUsdtConversionPrice = await this.getDfiUsdtConversionPrice()

    return await Promise.all(Object.entries(poolPairResult).map(async ([id, value]) => {
      return {
        ...value,
        id,
        totalLiquidityUsd: await this.getTotalLiquidityUsd(value, dfiUsdtConversionPrice)
      }
    }))
  }

  async get (id: string): Promise<PoolPairInfoPlus> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const dfiUsdtConversionPrice = await this.getDfiUsdtConversionPrice()
    const totalLiquidityUsd = await this.getTotalLiquidityUsd(info, dfiUsdtConversionPrice)

    return {
      ...info, id: String(id), totalLiquidityUsd
    }
  }

  async testPoolSwap (tokenFrom: string, tokenTo: string): Promise<string> {
    const testAddress = await this.rpcClient.wallet.getNewAddress()
    const metadata: TestPoolSwapMetadata = {
      tokenFrom: tokenFrom,
      tokenTo: tokenTo,
      from: testAddress,
      to: testAddress,
      amountFrom: 1
    }
    return await this.rpcClient.poolpair.testPoolSwap(metadata)
  }

  private async getDfiUsdtConversionPrice (): Promise<Record<string, BigNumber>> {
    const usdtToDfiAccount = await this.testPoolSwap('USDT', 'DFI')
    const usdtToDfi = new BigNumber(usdtToDfiAccount.split('@')[0])
    const dfiToUsdt = new BigNumber('1').div(usdtToDfi)

    return {
      usdtToDfi,
      dfiToUsdt
    }
  }

  private async getTotalLiquidityUsd (
    poolPairInfo: PoolPairInfo,
    dfiUsdtConversionPrice: Record<string, BigNumber>
  ): Promise<BigNumber> {
    const { usdtToDfi, dfiToUsdt } = dfiUsdtConversionPrice

    const poolPairSymbols = poolPairInfo.symbol.split('-')
    // TODO(canonbrother): guess should have other DFI alternatives in future
    const tokenSymbol = poolPairSymbols[0] !== 'DFI' ? poolPairSymbols[1] : poolPairSymbols[0]
    const swappedAccount = await this.testPoolSwap(tokenSymbol, 'DFI')

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

    // Note(canonbrother): totalLiquidity in USD calculation
    // reserveA_USD (eg: BTC) = reserveA * tokenToUsdt
    // reserveB_USD (eg: DFI) = reserveB * dfiToUsdt
    // totalLiquidity_USD = reserveA_USD + reserveB_USD
    return reserveAUsd.plus(reserveBUsd)
  }
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
  customRewards?: BigNumber
  creationTx: string
  creationHeight: BigNumber
}
