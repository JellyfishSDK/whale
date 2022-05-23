import { ProbeIndicator } from '@src/module.health/probe.indicator'
import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { Block, BlockMapper } from '@src/module.model/block'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Injectable()
export class ModelProbeIndicator extends ProbeIndicator {
  constructor (
    private readonly block: BlockMapper,
    private readonly client: JsonRpcClient
  ) {
    super()
  }

  /**
   * Liveness of Model Database
   * - unable to get the latest block from BlockMapper
   */
  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.block.getHighest()
    } catch (err) {
      return this.withDead('model', 'unable to get the latest block')
    }

    return this.withAlive('model')
  }

  /**
   * Readiness of Model Database
   * - unable to get the latest block
   * - synced blocks are undefined
   * - synced blocks are more than 2 blocks behind
   * - synced highest block height is still more than defid after 90 mins
   */
  async readiness (): Promise<HealthIndicatorResult> {
    let highest: Block
    let index: number | undefined
    let defid: number | undefined

    try {
      highest = await this.block.getHighest() as Block
      index = highest.height
      defid = await this.client.blockchain.getBlockCount()
    } catch (err) {
      return this.withDead('model', 'unable to get the latest block')
    }

    const details = {
      count: {
        index: index,
        defid: defid
      }
    }

    if (index === undefined || defid === undefined) {
      return this.withDead('model', 'synced blocks are undefined', details)
    }

    if (index + 2 <= defid) {
      return this.withDead('model', 'synced blocks are more than 2 blocks behind', details)
    }

    if (now() - highest.time >= 90 * 60 && index >= defid) {
      return this.withDead('model', 'defid chain is stale')
    }

    return this.withAlive('model', details)
  }
}

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}
