import { Controller, Get, Put, Body, Param, ParseIntPipe } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import {
  AppointOracleOptions,
  OraclePriceFeed,
  SetOracleDataOptions,
  UpdateOracleOptions,
  UTXO
} from '@defichain/jellyfish-api-core/dist/category/oracle'

@Controller('/v1/:network/oracle')
export class OracleController {
  constructor (private readonly client: JsonRpcClient) {
  }

  @Put('appoint')
  async appointOracle (address: string, @Body() priceFeeds: OraclePriceFeed[], @Body() appointOracleOptions: AppointOracleOptions): Promise<any> {
    return await this.client.oracle.appointOracle(address, priceFeeds, appointOracleOptions)
  }

  @Put('remove/:id')
  async removeOracle (@Param('id', ParseIntPipe) id: string, @Body() utxos?: UTXO[]): Promise<any> {
    return await this.client.oracle.removeOracle(id, utxos)
  }

  @Put('update/:id')
  async updateOracle (@Param('id', ParseIntPipe) id: string, address: string, @Body() updateOracleOptions: UpdateOracleOptions): Promise<any> {
    return await this.client.oracle.updateOracle(id, address, updateOracleOptions)
  }

  @Get('')
  async list (): Promise<any> {
    const data = await this.client.oracle.listOracles()
    return data.sort((a, b) => (a > b ? 1 : -1))
  }

  @Get('/:id')
  async get (@Param('id', ParseIntPipe) id: string): Promise<any> {
    return await this.client.oracle.getOracleData(id)
  }

  @Put('set/:id')
  async setOracleData (@Param('id', ParseIntPipe) id: string, timestamp: number, setOracleDataOptions: SetOracleDataOptions): Promise<any> {
    return await this.client.oracle.setOracleData(id, timestamp, setOracleDataOptions)
  }

  // @Get('/listlatestrawprices')
  // async listlatestrawprices (token: string, currency: string): Promise<any> {
  //   return await this.client.oracle.listlatestrawprices({token, currency}})
  // }

  // @Get('/getPrice')
  // async getPrices (token: string, currency: string): Promise<any> {
  //   return await this.client.oracle.listPrices({token, currency}})
  // }

  // @Get('/listPrices')
  // async listPrices (): Promise<ListPricesData[]> {
  //   return await this.client.oracle.listPrices()
  // }
}
