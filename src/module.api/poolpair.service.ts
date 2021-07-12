import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'

@Injectable()
export class PoolPairService {
  dfiTokenId: string = '0'

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

    const dfiUsdtConversion = await this.getUsdtDfiConversion()

    return await Promise.all(Object.entries(poolPairResult).map(async ([id, value]) => {
      return {
        ...value,
        id,
        totalLiquidityUsd: await this.getTotalLiquidityUsd(value, dfiUsdtConversion)
      }
    }))
  }

  async get (id: string): Promise<PoolPairInfoPlus> {
    const info = await this.deFiDCache.getPoolPairInfo(id)
    if (info === undefined) {
      throw new NotFoundException('Unable to find poolpair')
    }

    const dfiUsdtConversion = await this.getUsdtDfiConversion()
    const totalLiquidityUsd = await this.getTotalLiquidityUsd(info, dfiUsdtConversion)

    return {
      ...info, id: String(id), totalLiquidityUsd
    }
  }

  private async getUsdtDfiConversion (): Promise<Record<string, BigNumber>> {
    const usdtToDfi = await this.dexUsdtDfi()
    const dfiToUsdt = new BigNumber('1').div(usdtToDfi)

    return {
      usdtToDfi,
      dfiToUsdt
    }
  }

  async dexUsdtDfi (): Promise<BigNumber> {
    const poolPairResult = await this.rpcClient.poolpair.getPoolPair('USDT-DFI')
    const poolPairInfo = poolPairResult[Object.keys(poolPairResult)[0]]
    // to find 1token = ?DFI -> reserveB(DFI)/reserveA(token)
    return new BigNumber(poolPairInfo['reserveB/reserveA'])
  }

  private async getTotalLiquidityUsd (
    poolPairInfo: PoolPairInfo,
    dfiUsdtConversion: Record<string, BigNumber>
  ): Promise<BigNumber> {
    const { usdtToDfi, dfiToUsdt } = dfiUsdtConversion

    // check position of DFI token for safe, eg: BTC-DFI or DFI-BTC
    const tokenToDfi = poolPairInfo.idTokenB === this.dfiTokenId
      ? new BigNumber(poolPairInfo['reserveB/reserveA'])
      : new BigNumber(poolPairInfo['reserveA/reserveB'])

    const tokenToUsdt = usdtToDfi.div(tokenToDfi)

    const reserveAUsd = poolPairInfo.idTokenB === this.dfiTokenId
      ? poolPairInfo.reserveA.times(tokenToUsdt)
      : poolPairInfo.reserveA.times(dfiToUsdt)

    const reserveBUsd = poolPairInfo.idTokenB === this.dfiTokenId
      ? poolPairInfo.reserveB.times(dfiToUsdt)
      : poolPairInfo.reserveB.times(tokenToUsdt)

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
