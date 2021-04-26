import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp } from './module.testing'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  app = await createTestingApp(container)
})

afterAll(async () => {
  await container.stop()
})

describe('/_health/probes/liveness', () => {
  it('should wait until liveness', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_health/probes/liveness'
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      details: {
        defid: {
          status: 'up'
        }
      },
      error: {},
      info: {
        defid: {
          status: 'up'
        }
      },
      status: 'ok'
    })
  })
})

describe('/_health/probes/readiness', () => {
  // TODO(fuxingloh): /_health/probes/readiness tests for it to be ready

  it('should wait until readiness, but never will be as it lacks connections', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/_health/probes/readiness'
    })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({
      details: {
        defid: {
          blocks: 1,
          headers: 1,
          initialBlockDownload: true,
          peers: 0,
          status: 'down'
        }
      },
      error: {
        defid: {
          blocks: 1,
          headers: 1,
          initialBlockDownload: true,
          peers: 0,
          status: 'down'
        }
      },
      info: {},
      status: 'error'
    })
  })
})
