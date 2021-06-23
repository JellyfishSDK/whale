import { Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { ConfigService } from '@nestjs/config'

export class PoolPairService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly deFiDCache: DeFiDCache,
    protected readonly configService: ConfigService
  ) {
  }

  /**
   * @param {PaginationQuery} query
   * @param {number} query.size
   * @param {string} [query.next]
   * @return {Promise<ApiPagedResponse<PoolPairData>>}
   */
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PoolPairData>> {
    const poolPairResult = await this.rpcClient.poolpair.listPoolPairs({
      start: query.next !== undefined ? Number(query.next) : 0,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, true)

    // const usdt = this.configService.get<string>('app.tvlBaseToken')
    // let priceRatioUSDTDFI: BigNumber | string
    // for (const k in poolPairResult) {
    //   const poolPair = poolPairResult[k]
    //   if (poolPair.symbol === `${usdt}-DFI`) {
    //     priceRatioUSDTDFI = poolPair.reserveA.isGreaterThan(poolPair.reserveB)
    //       ? poolPair['reserveA/reserveB']
    //       : poolPair['reserveB/reserveA']
    //   }
    // }

    // https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=bitcoin,ethereum,tether
    // ethereum
    // usd  1988.97
    // tether
    // usd  1.01
    // bitcoin
    // usd  33179
    // defichain
    // usd  2.54

    // const liquidityReserveIdTokenA = new Big(reserveA).times(
    //   price[idTokenA] || 0,
    // );

    // const liquidityReserveIdTokenB = new Big(reserveB).times(
    //   price[idTokenB] || 0,
    // );

    // const totalLiquidity = liquidityReserveIdTokenA.plus(
    //   liquidityReserveIdTokenB,
    // );

    // 1btc = 12669.65404748 dfi
    // 1usdt = 0.39205003 dfi
    // 1btc = 32316.421573747 usdt

    // reserveA = 3356.37 * 33179 = 111361000.23
    // reserveB = 42609608.00 * 2.54 = 108228404.32
    // expect(218810809.47).toBe(219589404.55)

    // reserveA = 3356.37 * 32316.421573747 = 108449386.502474607
    // reserveB = 42609608.00 * 2.54050227 = 107844543.553828534
    // expect(218810809.47).toBe(216293930.056303141)

    let remapped: any
    for (const k in poolPairResult) {
      const poolPair = poolPairResult[k]
      remapped[k] = {
        ...poolPair,
        totalLiquidityUSD: 0
      }
    }

    const poolPairInfosDto = Object.entries(poolPairResult).map(([id, value]) => {
      return mapPoolPair(id, value)
    }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(poolPairInfosDto, query.size, item => {
      return item.id
    })
  }
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
