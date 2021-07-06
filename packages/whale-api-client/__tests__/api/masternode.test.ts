import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await service.start()
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should list masternodes', async () => {
    const data = await client.masternodes.list()
    expect(Object.keys(data[0]).length).toStrictEqual(13)
    expect(data.hasNext).toStrictEqual(false)
    expect(data.nextToken).toStrictEqual(undefined)
  })

  it('should list masternodes with pagination', async () => {
    // get the initial length of  masternodes.
    const initialLength = (await client.masternodes.list()).length
    const paginationSize = (initialLength / 2)
    const lastIndex = (paginationSize - 1)

    const first = await client.masternodes.list(paginationSize)
    expect(first.length).toStrictEqual(paginationSize)
    expect(first.nextToken).toStrictEqual(first[lastIndex].id)

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(paginationSize)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual(next[lastIndex].id)

    const last = await client.paginate(next)
    expect(last.length).toStrictEqual(0)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toStrictEqual(undefined)
  })
})

describe('get', () => {
  it('should get masternode', async () => {
    // get a masternode from list
    const masternode = (await client.masternodes.list(1))[0]

    const data = await client.masternodes.get(masternode.id)
    expect(Object.keys(data).length).toStrictEqual(13)
    expect(data).toStrictEqual(masternode)
  })

  it('should fail and throw an error with wrong id', async () => {
    expect.assertions(2)
    const id = '8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816'
    try {
      await client.masternodes.get(id)
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find masternode',
        url: `/v0/regtest/masternodes/${id}`
      })
    }
  })

  it('should fail and throw an error with malformed id', async () => {
    expect.assertions(2)
    try {
      await client.masternodes.get('sdh183')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: "RpcApiError: 'masternode id must be of length 64 (not 6, for 'sdh183')', code: -8, method: getmasternode",
        url: '/v0/regtest/masternodes/sdh183'
      })
    }
  })
})
