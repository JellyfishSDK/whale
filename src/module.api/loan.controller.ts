import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query
} from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import {
  CollateralTokenDetail,
  LoanTokenResult
} from '@defichain/jellyfish-api-core/dist/category/loan'
import {
  CollateralToken,
  LoanToken,
  LoanVaultActive,
  LoanVaultLiquidated
} from '@whale-api-client/api/loan'
import { mapTokenData } from '@src/module.api/token.controller'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { LoanVaultService } from '@src/module.api/loan.vault.service'
import { OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { ActivePrice } from '@whale-api-client/api/prices'
import { LoanSchemeMapper, LoanScheme } from '@src/module.model/loan.scheme'

@Controller('/loans')
export class LoanController {
  constructor (
    private readonly client: JsonRpcClient,
    private readonly deFiDCache: DeFiDCache,
    private readonly vaultService: LoanVaultService,
    private readonly priceActiveMapper: OraclePriceActiveMapper,
    private readonly loanSchemeMapper: LoanSchemeMapper
  ) {
  }

  /**
   * Paginate loan schemes.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanScheme>>}
   */
  @Get('/schemes')
  async listScheme (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanScheme>> {
    const items = await this.loanSchemeMapper.query(query.size, query.next)

    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  /**
   * Get information about a scheme with given scheme id.
   *
   * @param {string} id
   * @return {Promise<LoanScheme>}
   */
  @Get('/schemes/:id')
  async getScheme (@Param('id') id: string): Promise<LoanScheme> {
    try {
      const data = await this.loanSchemeMapper.get(id)
      if (data === undefined) {
        throw new NotFoundException('Unable to find scheme')
      }
      return data
    } catch (err) {
      if (err instanceof NotFoundException && err.message === 'Unable to find scheme') {
        throw err
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  /**
   * Paginate loan collaterals.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<CollateralToken>>}
   */
  @Get('/collaterals')
  async listCollateral (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<CollateralToken>> {
    const result = (await this.client.loan.listCollateralTokens())
      .sort((a, b) => a.tokenId.localeCompare(b.tokenId))
      .map(async value => await this.mapCollateralToken(value))
    const items = await Promise.all(result)

    return createFakePagination(query, items, item => item.tokenId)
  }

  /**
   * Get information about a collateral token with given collateral token.
   *
   * @param {string} id
   * @return {Promise<CollateralTokenDetail>}
   */
  @Get('/collaterals/:id')
  async getCollateral (@Param('id') id: string): Promise<CollateralToken> {
    try {
      const data = await this.client.loan.getCollateralToken(id)
      return await this.mapCollateralToken(data)
    } catch (err) {
      if (err instanceof RpcApiError && err?.payload?.message === `Token ${id} does not exist!`) {
        throw new NotFoundException('Unable to find collateral token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  /**
   * Paginate loan tokens.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanToken>>}
   */
  @Get('/tokens')
  async listLoanToken (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<LoanToken>> {
    const result = Object.entries(await this.client.loan.listLoanTokens())
      .map(async ([, value]) => await this.mapLoanToken(value))
    const items = (await Promise.all(result))
      .sort((a, b) => a.tokenId.localeCompare(b.tokenId))

    return createFakePagination(query, items, item => item.tokenId)
  }

  /**
   * Get information about a loan token with given loan token.
   *
   * @param {string} id
   * @return {Promise<LoanTokenResult>}
   */
  @Get('/tokens/:id')
  async getLoanToken (@Param('id') id: string): Promise<LoanToken> {
    try {
      const data = await this.client.loan.getLoanToken(id)
      return await this.mapLoanToken(data)
    } catch (err) {
      if (err instanceof RpcApiError && err?.payload?.message === `Token ${id} does not exist!`) {
        throw new NotFoundException('Unable to find loan token')
      } else {
        throw new BadRequestException(err)
      }
    }
  }

  /**
   * Paginate loan vaults.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>>}
   */
  @Get('/vaults')
  async listVault (@Query() query: PaginationQuery): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    return await this.vaultService.list(query)
  }

  /**
   * Get information about a vault with given vault id.
   *
   * @param {string} id
   * @return {Promise<LoanVaultActive | LoanVaultLiquidated>}
   */
  @Get('/vaults/:id')
  async getVault (@Param('id') id: string): Promise<LoanVaultActive | LoanVaultLiquidated> {
    return await this.vaultService.get(id)
  }

  /**
   * Paginate loan auctions.
   *
   * @param {PaginationQuery} query
   * @return {Promise<ApiPagedResponse<LoanVaultLiquidated>>}
   */
  @Get('/auctions')
  async listAuction (@Query() query: PaginationQuery): Promise<ApiPagedResponse<LoanVaultLiquidated>> {
    return await this.vaultService.listAuction(query)
  }

  async mapCollateralToken (detail: CollateralTokenDetail): Promise<CollateralToken> {
    const result = await this.deFiDCache.getTokenInfoBySymbol(detail.token)
    if (result === undefined) {
      throw new ConflictException('unable to find token')
    }

    const id = Object.keys(result)[0]
    const tokenInfo = result[id]

    return {
      tokenId: detail.tokenId,
      token: mapTokenData(id, tokenInfo),
      factor: detail.factor.toFixed(),
      activateAfterBlock: detail.activateAfterBlock.toNumber(),
      fixedIntervalPriceId: detail.fixedIntervalPriceId,
      activePrice: await this.getActivePrice(detail.fixedIntervalPriceId)
    }
  }

  async mapLoanToken (result: LoanTokenResult): Promise<LoanToken> {
    const id = Object.keys(result.token)[0]
    const tokenInfo = result.token[id]

    return {
      tokenId: tokenInfo.creationTx,
      token: mapTokenData(id, tokenInfo),
      interest: result.interest.toFixed(),
      fixedIntervalPriceId: result.fixedIntervalPriceId,
      activePrice: await this.getActivePrice(result.fixedIntervalPriceId)
    }
  }

  async getActivePrice (fixedIntervalPriceId: string): Promise<ActivePrice | undefined> {
    const [token, currency] = fixedIntervalPriceId.split('/')
    const prices = await this.priceActiveMapper.query(`${token}-${currency}`, 1)
    return prices[0]
  }
}

function createFakePagination<T> (query: PaginationQuery, items: T[], mapId: (item: T) => string): ApiPagedResponse<T> {
  function findNextIndex (): number {
    if (query.next === undefined) {
      return 0
    }

    const findIndex = items.findIndex(item => mapId(item) === query.next)
    return findIndex > 0 ? findIndex + 1 : items.length
  }

  const index = findNextIndex()
  const sliced = items.slice(index, index + query.size)
  return ApiPagedResponse.of(sliced, query.size, mapId)
}
