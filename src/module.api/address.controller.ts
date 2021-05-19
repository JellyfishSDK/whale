import BigNumber from 'bignumber.js'
import { ConflictException, Controller, Get, Param, Query } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { TokenInfoCache } from '@src/module.api/cache/token.info.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { AddressToken } from '@whale-api-client/api/address'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { ScriptActivity, ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregation, ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspent, ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { DeFiAddress } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'

@Controller('/v1/:network/address/:address')
export class AddressController {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly tokenInfoCache: TokenInfoCache,
    protected readonly aggregationMapper: ScriptAggregationMapper,
    protected readonly activityMapper: ScriptActivityMapper,
    protected readonly unspentMapper: ScriptUnspentMapper
  ) {
  }

  @Get('/balance')
  async getBalance (
    @Param('network') network: NetworkName,
      @Param('address') address: string
  ): Promise<string> {
    const aggregation = await this.getAggregation(network, address)
    return aggregation?.amount.unspent ?? '0.00000000'
  }

  @Get('/aggregation')
  async getAggregation (
    @Param('network') network: NetworkName,
      @Param('address') address: string
  ): Promise<ScriptAggregation | undefined> {
    const hid = addressToHid(network, address)
    return await this.aggregationMapper.getLatest(hid)
  }

  /**
   * @param {string} address to list tokens belonging to address
   * @param {PaginationQuery} query
   */
  @Get('/tokens')
  async listTokens (
    @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<AddressToken>> {
    const accounts = await this.rpcClient.account.getAccount(address, {
      start: query.next !== undefined ? Number(query.next) : undefined,
      including_start: query.next === undefined, // TODO(fuxingloh): open issue at DeFiCh/ain, rpc_accounts.cpp#388
      limit: query.size
    }, { indexedAmounts: true })

    const ids = Object.keys(accounts)
    const tokenInfos = await this.tokenInfoCache.batch(ids)

    const tokens: AddressToken[] = Object.entries(accounts)
      .map(([id, value]): AddressToken => {
        const tokenInfo = tokenInfos[id]
        if (tokenInfo === undefined) {
          throw new ConflictException('unable to find token')
        }

        return mapAddressToken(id, tokenInfo, value)
      }).sort(a => Number.parseInt(a.id))

    return ApiPagedResponse.of(tokens, query.size, item => {
      return item.id
    })
  }

  @Get('/transactions')
  async listTransactions (
    @Param('network') network: NetworkName,
      @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<ScriptActivity>> {
    const hid = addressToHid(network, address)
    const items = await this.activityMapper.query(hid, query.size, query.next)

    return ApiPagedResponse.of(items, query.size, item => {
      return item.id
    })
  }

  @Get('/transactions/unspent')
  async listTransactionUnspent (
    @Param('network') network: NetworkName,
      @Param('address') address: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<ScriptUnspent>> {
    const hid = addressToHid(network, address)
    const items = await this.unspentMapper.query(hid, query.size, query.next)

    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }
}

/**
 * @param {NetworkName} name of the network
 * @param {string} address to convert to HID
 * @return {string} HID is hashed script.hex, SHA256(decodeAddress(address).hex)
 */
export function addressToHid (name: NetworkName, address: string): string {
  // TODO(fuxingloh): refactor jellyfish-address, then refactor this
  const decoded = DeFiAddress.from(name, address)
  const stack = decoded.getScript().stack
  const hex = toBuffer(stack).toString('hex')
  return HexEncoder.asSHA256(hex)
}

function mapAddressToken (id: string, tokenInfo: TokenInfo, value: BigNumber): AddressToken {
  return {
    id: id,
    amount: value.toFixed(8),
    symbol: tokenInfo.symbol,
    symbolKey: tokenInfo.symbolKey,
    name: tokenInfo.name,
    isDAT: tokenInfo.isDAT,
    isLPS: tokenInfo.isLPS
  }
}
