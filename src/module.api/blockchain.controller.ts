import {
  Get,
  Controller,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { NetworkGuard } from '@src/module.api/commons/network.guard'
import { ResponseInterceptor } from '@src/module.api/commons/response.interceptor'
import { ExceptionInterceptor } from '@src/module.api/commons/exception.interceptor'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Controller('/v1/:network/mempool')
@UseGuards(NetworkGuard)
@UseInterceptors(ResponseInterceptor, ExceptionInterceptor)
export class BlockchainController {
  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * Returns all transaction ids in memory pool as a json array of string transaction ids.
   * @return {Promise<string[]>} transaction ids
   */
  @Get('/transactions')
  async getTransactions (): Promise<string[]> {
    return await this.client.blockchain.getRawMempool(false)
  }
}
