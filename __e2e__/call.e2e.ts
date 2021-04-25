import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import waitForExpect from 'wait-for-expect'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

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

it('should 404 with invalid network', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1.0/mainnet/call/getblockchaininfo'
  })

  expect(res.statusCode).toBe(404)
  expect(res.json()).toEqual({
    error: 'Not Found',
    message: 'Network not found',
    statusCode: 404
  })
})

it('should 403 with non whitelisted method', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1.0/regtest/call/getbalance'
  })

  expect(res.statusCode).toBe(403)
  expect(res.json()).toEqual({
    error: 'Forbidden',
    message: 'RPC method not whitelisted',
    statusCode: 403
  })
})

it('should 400 with invalid post body params', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1.0/regtest/call/getblock',
    payload: {
      params: {
        block: 1
      }
    }
  })

  expect(res.statusCode).toBe(400)
  expect(res.json()).toEqual({
    error: 'Bad Request',
    message: "RpcApiError: 'Unknown named parameter block', code: -8",
    statusCode: 400
  })
})

describe('whitelisted rpc methods', () => {
  it('should 200 POST: /v1.0/regtest/call/getblockchaininfo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1.0/regtest/call/getblockchaininfo'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

    const { data } = res.json()
    expect(data.chain).toBe('regtest')
    expect(typeof data.blocks).toBe('number')
  })

  it('should 200 POST: /v1.0/regtest/call/getblockcount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1.0/regtest/call/getblockcount'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

    const { data } = res.json()
    expect(typeof data).toBe('number')
  })

  it('should 200 POST: /v1.0/regtest/call/getblockhash', async () => {
    await waitForExpect(async () => {
      const count = await container.call('getblockcount')
      await expect(count).toBeGreaterThan(1)
    })

    const res = await app.inject({
      method: 'POST',
      url: '/v1.0/regtest/call/getblockhash',
      payload: {
        params: [1]
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

    const { data } = res.json()
    expect(data.length).toBe(64)
  })

  it('should 200 POST: /v1.0/regtest/call/getblock', async () => {
    await waitForExpect(async () => {
      const count = await container.call('getblockcount')
      await expect(count).toBeGreaterThan(1)
    })
    const hash = await container.call('getblockhash', [1])

    const res = await app.inject({
      method: 'POST',
      url: '/v1.0/regtest/call/getblock',
      payload: {
        params: [hash]
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

    const { data } = res.json()
    expect(data.hash.length).toBe(64)
    expect(Array.isArray(data.tx)).toBe(true)
  })
})
