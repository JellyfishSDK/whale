import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import { NotFoundException } from '@nestjs/common'
import { MasternodeController } from '@src/module.api/masternode.controller'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: MasternodeController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()

  app = await createTestingApp(container)
  controller = app.get(MasternodeController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should list masternodes', async () => {
    const result = await controller.list({ size: 4 })
    expect(result.data.length).toStrictEqual(4)
    expect(Object.keys(result.data[0]).length).toStrictEqual(13)
  })

  it('should list masternodes with pagination', async () => {
    const initialLength = (await controller.list({ size: 100 })).data.length
    const paginationSize = (initialLength / 2)
    const lastIndex = (paginationSize - 1)

    const first = await controller.list({ size: paginationSize })
    expect(first.data.length).toStrictEqual(paginationSize)

    const next = await controller.list({
      size: paginationSize,
      next: first.page?.next
    })
    expect(next.data.length).toStrictEqual(paginationSize)
    expect(next.page.next).toStrictEqual(next.data[lastIndex].id)

    const last = await controller.list({
      size: paginationSize,
      next: next.page?.next
    })
    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toStrictEqual(undefined)
  })
})

describe('get', () => {
  it('should get a masternode with id', async () => {
    // get a masternode from list
    const masternode = (await controller.list({ size: 1 })).data[0]

    const result = await controller.get(masternode.id)
    expect(Object.keys(result).length).toStrictEqual(13)
    expect(result).toStrictEqual(masternode)
  })

  it('should fail and throw an error with wrong id', async () => {
    const id = '8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816'
    try {
      await controller.get(id)
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find masternode',
        error: 'Not Found'
      })
    }
  })
})
