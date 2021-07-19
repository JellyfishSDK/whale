import { BlockController, parseHeight } from '@src/module.api/block.controller'
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
  it('get should get block with hash of block', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const block = await controller.get(blockHash)
    expect(block?.height).toStrictEqual(100)
    expect(block?.hash).toStrictEqual(blockHash)
  })

  it('get should get undefined with invalid hash ', async () => {
    const block = await controller.get('lajsdl;kfjljklj12lk34j')
    expect(block).toStrictEqual(undefined)
  })

  it('get should get block with height', async () => {
    const block = await controller.get('100')
    expect(block?.height).toStrictEqual(100)
  })

  it('getBlockTransactions should get transactions from a block by hash', async () => {
    const blockHash = await container.call('getblockhash', [100])
    const paginatedTransactions = await controller.getBlockTransactions(blockHash, { size: 30, next: '10' })

    // there's only one transaction
    expect(paginatedTransactions.data.length).toStrictEqual(1)
    expect(paginatedTransactions.data[0].block.height).toStrictEqual(100)
  })

  it('getBlockTransactions should get transactions from a block by height', async () => {
    const paginatedTransactions = await controller.getBlockTransactions('100', { size: 30, next: '10' })

    // there's only one transaction
    expect(paginatedTransactions.data.length).toStrictEqual(1)

    expect(paginatedTransactions.data[0].block.height).toStrictEqual(100)
  })

  it('getBlockTransactions should get transactions from a block at height 10', async () => {
    const paginatedTransactions = await controller.getBlockTransactions('49', { size: 30, next: '10' })

    console.log('paginatedTransactions', paginatedTransactions)

    // there's only one transaction
    expect(paginatedTransactions.data.length).toStrictEqual(1)

    expect(paginatedTransactions.data[0].block.height).toStrictEqual(49)
  })

  it('getBlockTransactions should get transactions from a block at height 21 will always have 0 transactions', async () => {
    const paginatedTransactions = await controller.getBlockTransactions('21', { size: 30, next: '10' })

    // there's only one transaction
    expect(paginatedTransactions.data.length).toStrictEqual(0)
  })

  it('getBlockTransactions should get first few transactions from a block by hash', async () => {
    const blockHash = await container.call('getblockhash', [3])
    const paginatedTransactions = await controller.getBlockTransactions(blockHash, { size: 30 })

    // there's only one transaction
    expect(paginatedTransactions.data.length).toStrictEqual(1)
  })

  it('getBlockTransactions should get empty array when hash is not valid', async () => {
    const paginatedTransactions = await controller.getBlockTransactions('z1wadfsvq90qlkfalnklvm', { size: 30 })

    expect(paginatedTransactions.data.length).toStrictEqual(0)
  })

  it('getBlockTransactions should get empty array when height is not valid', async () => {
    const paginatedTransactions = await controller.getBlockTransactions('999999999999', { size: 30 })

    expect(paginatedTransactions.data.length).toStrictEqual(0)
  })

  it('list should be able to get a paginated response of blocks', async () => {
    const paginatedBlocks = await controller.list({ size: 30, next: '40' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toStrictEqual(39)

    const secondPaginatedBlocks = await controller.list({ size: 30, next: '30' })

    expect(secondPaginatedBlocks.data.length).toStrictEqual(30)
    expect(secondPaginatedBlocks.data[0].height).toStrictEqual(29)
  })

  it('list should be able top few transactions', async () => {
    const paginatedBlocks = await controller.list({ size: 30, next: '40' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toStrictEqual(39)
  })

  it('list should get empty array when next is 0', async () => {
    const paginatedBlocks = await controller.list({ size: 30, next: '0' })

    expect(paginatedBlocks.data.length).toStrictEqual(0)
  })

  it('list would return all the blocks if the size is out of range', async () => {
    const paginatedBlocks = await controller.list({ size: 100000, next: '100' })

    expect(paginatedBlocks.data.length).toStrictEqual(100)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(99)
  })

  it('list would return the latest set if next is outside of range', async () => {
    const paginatedBlocks = await controller.list({ size: 30, next: '100000' })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(100)
  })

  it('list would return the latest set if next is undefined', async () => {
    const paginatedBlocks = await controller.list({ size: 30 })

    expect(paginatedBlocks.data.length).toStrictEqual(30)
    expect(paginatedBlocks.data[0].height).toBeGreaterThanOrEqual(100)
  })
})

describe('parseHeight', () => {
  it('should return undefined for negative integer', () => {
    expect(parseHeight('-123')).toStrictEqual(undefined)
  })

  it('should return undefined for float', () => {
    expect(parseHeight('123.32')).toStrictEqual(undefined)
  })

  it('should return number for positive integers', () => {
    expect(parseHeight('123')).toStrictEqual(123)
  })

  it('should return undefined for empty string', () => {
    expect(parseHeight('')).toStrictEqual(undefined)
  })

  it('should return undefined for undefined', () => {
    expect(parseHeight(undefined)).toStrictEqual(undefined)
  })

  it('should return undefined for strings with characters', () => {
    expect(parseHeight('123a')).toStrictEqual(undefined)
  })
})
