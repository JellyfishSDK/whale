import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { HealthIndicatorResult, ProbeIndicator } from '@src/module.health/probe.indicator'
import { blockchain as bc } from '@defichain/jellyfish-api-core'

@Injectable()
export class DeFiDProbeIndicator extends ProbeIndicator {
  lastBlock: bc.Block<bc.Transaction> | undefined

  constructor (private readonly client: JsonRpcClient) {
    super()
  }

  /**
   * Liveness of DeFiD.
   * - defid is not connected
   */
  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.client.net.getConnectionCount()
    } catch (err) {
      return this.withDead('defid', 'unable to connect to defid')
    }

    return this.withAlive('defid')
  }

  /**
   * Readiness of DeFiD.
   * - defid is not in initial block download
   * - defid is connected to only count<5 peers
   * - defid checks stale tip by checking coming block after 90 mins
   */
  async readiness (): Promise<HealthIndicatorResult> {
    let info: bc.BlockchainInfo
    let peers: number
    let block: bc.Block<bc.Transaction>
    try {
      info = await this.client.blockchain.getBlockchainInfo()
      peers = await this.client.net.getConnectionCount()
      block = await this.client.blockchain.getBlock(info.bestblockhash, 2)
    } catch (err) {
      return this.withDead('defid', 'unable to connect to defid')
    }

    const details = {
      initialBlockDownload: info.initialblockdownload,
      blocks: info.blocks,
      headers: info.headers,
      peers: peers
    }

    if (info.initialblockdownload) {
      return this.withDead('defid', 'defid is in initial block download', details)
    }

    if (peers === 0) {
      return this.withDead('defid', 'defid is not connected to any peer', details)
    }

    if (this.lastBlock === undefined) {
      this.lastBlock = block
    }

    if (now() - this.lastBlock.time >= 90 * 60 && this.lastBlock.height >= block.height) {
      return this.withDead('defid', 'defid chain is stale', details)
    }
    this.lastBlock = block

    return this.withAlive('defid', details)
  }
}

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}
