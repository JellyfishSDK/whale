import { BlockController } from '@src/module.api/block.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: BlockController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)

  await waitForIndexedHeight(app, 100)
  controller = app.get(BlockController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('BlockController', () => {
  it('getBlock should get block with hash of block', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await controller.getBlock(blockHash)
    expect(block?.height).toStrictEqual(100)
    expect(block?.hash).toStrictEqual(blockHash)
  })

  it('getBlock should get undefined with invalid hash ', async () => {
    const block = await controller.getBlock('lajsdl;kfjljklj12lk34j')
    expect(block).toStrictEqual(undefined)
  })

  it('getBlock should get block with height', async () => {
    const block = await controller.getBlock('100')
    expect(block?.height).toStrictEqual(100)
  })

  it('getBlockTransactions should get transactions from a block by hash', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const paginatedTransactions = await controller.getBlockTransactions(blockHash, { size: 30, next: '10' })

    // there's only one transaction
    //
    expect(paginatedTransactions.data.length).toStrictEqual(1)
  })

  it('getBlockTransactions should get first few transactions from a block by hash', async () => {
    const blockHash = await container.call('getblockhash', [3])
    const paginatedTransactions = await controller.getBlockTransactions(blockHash, { size: 30 })

    // there's only one transaction
    expect(paginatedTransactions.data.length).toStrictEqual(1)
  })

  it('listBlocks should be able to get a paginated response of blocks', async () => {
    const paginatedBlocks = await controller.listBlocks({ size: 30, next: '40' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toStrictEqual(39)
  })

  it('listBlocks should be able top few transactions', async () => {
    const paginatedBlocks = await controller.listBlocks({ size: 30, next: '40' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toStrictEqual(39)
  })

  it('listBlocks should get empty array when next is 0', async () => {
    const paginatedBlocks = await controller.listBlocks({ size: 30, next: '0' })

    expect(paginatedBlocks.data.length).toStrictEqual(0)
  })

  it('listBlocks would return all the blocks if the size is out of range', async () => {
    const paginatedBlocks = await controller.listBlocks({ size: 100000, next: '100' })

    expect(paginatedBlocks.data.length).toStrictEqual(100)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(99)
  })

  it('listBlocks would return the latest set if next is outside of range', async () => {
    const paginatedBlocks = await controller.listBlocks({ size: 30, next: '100000' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(100)
  })

  it('listBlocks would return the latest set if next is undefined', async () => {
    const paginatedBlocks = await controller.listBlocks({ size: 30 })

    expect(paginatedBlocks.data.length).toStrictEqual(0)
  })
})
