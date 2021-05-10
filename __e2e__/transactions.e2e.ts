import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp } from './module.testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Bech32, Elliptic, EllipticPair, HRP, WIF } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  app = await createTestingApp(container)
  client = app.get(JsonRpcClient)
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(15)
})

async function createSignedTxnHex (
  aAmount: number,
  bAmount: number,
  a: EllipticPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii')),
  b: EllipticPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
): Promise<string> {
  const aBech32 = Bech32.fromPubKey(await a.publicKey(), RegTest.bech32.hrp as HRP)
  const bBech32 = Bech32.fromPubKey(await b.publicKey(), RegTest.bech32.hrp as HRP)

  const { txid, vout } = await container.fundAddress(aBech32, aAmount)
  const inputs = [{ txid: txid, vout: vout }]

  const unsigned = await client.rawtx.createRawTransaction(inputs, {
    [bBech32]: new BigNumber(bAmount)
  })
  const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [
    WIF.encode(RegTest.wifPrefix, await a.privateKey())
  ])
  return signed.hex
}

async function expectTxn (txid: string, amount: number, pubKey: Buffer): Promise<void> {
  const details = await client.blockchain.getTxOut(txid, 0)

  expect(details.value.toString(10)).toBe(amount.toString())
  expect(details.scriptPubKey.addresses[0]).toBe(
    Bech32.fromPubKey(pubKey, RegTest.bech32.hrp as HRP)
  )
}

function describeFailValidations (url: string): void {
  describe('fail validations', () => {
    it('should fail validation (empty hex)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: url,
        payload: {
          hex: ''
        }
      })

      expect(res.statusCode).toBe(422)
      expect(res.json()).toEqual({
        error: {
          at: expect.any(Number),
          code: 422,
          type: 'ValidationError',
          url: url,
          validation: {
            properties: [
              {
                constraints: [
                  'hex must be a hexadecimal number',
                  'hex should not be empty'
                ],
                property: 'hex',
                value: ''
              }
            ]
          }
        }
      })
    })

    it('should fail validation (not hex)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: url,
        payload: {
          hex: 'fuxingloh'
        }
      })

      expect(res.statusCode).toBe(422)
      expect(res.json()).toEqual({
        error: {
          at: expect.any(Number),
          code: 422,
          type: 'ValidationError',
          url: url,
          validation: {
            properties: [
              {
                constraints: [
                  'hex must be a hexadecimal number'
                ],
                property: 'hex',
                value: 'fuxingloh'
              }
            ]
          }
        }
      })
    })

    it('should fail validation (negative fee)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: url,
        payload: {
          hex: '00',
          maxFeeRate: -1.5
        }
      })

      expect(res.statusCode).toBe(422)
      expect(res.json()).toEqual({
        error: {
          at: expect.any(Number),
          code: 422,
          type: 'ValidationError',
          url: url,
          validation: {
            properties: [
              {
                constraints: [
                  'maxFeeRate must not be less than 0'
                ],
                property: 'maxFeeRate',
                value: -1.5
              }
            ]
          }
        }
      })
    })

    it('should fail validation (not number fee)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: url,
        payload: {
          hex: '00',
          maxFeeRate: 'abc'
        }
      })

      expect(res.statusCode).toBe(422)
      expect(res.json()).toEqual({
        error: {
          at: expect.any(Number),
          code: 422,
          type: 'ValidationError',
          url: url,
          validation: {
            properties: [
              {
                constraints: [
                  'maxFeeRate must not be less than 0',
                  'maxFeeRate must be a number conforming to the specified constraints'
                ],
                property: 'maxFeeRate',
                value: 'abc'
              }
            ]
          }
        }
      })
    })
  })
}

describe('POST: /v1/regtest/transactions/test', () => {
  describeFailValidations('/v1/regtest/transactions/test')

  it('should accept valid txn', async () => {
    const hex = await createSignedTxnHex(10, 9.9999)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions/test',
      payload: {
        hex: hex
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({})
  })

  it('should accept valid txn with given maxFeeRate', async () => {
    const hex = await createSignedTxnHex(10, 9.995)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions/test',
      payload: {
        hex: hex,
        maxFeeRate: 0.05
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({})
  })

  it('should reject due to invalid txn', async () => {
    const hex = '0400000100881133bb11aa00cc'
    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions/test',
      payload: {
        hex: hex
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: {
        type: 'BadRequest',
        code: 400,
        url: '/v1/regtest/transactions/test',
        at: expect.any(Number)
      }
    })
  })

  it('should reject due to high fees', async () => {
    const hex = await createSignedTxnHex(10, 9)
    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions/test',
      payload: {
        hex: hex,
        maxFeeRate: 1
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: {
        type: 'BadRequest',
        code: 400,
        url: '/v1/regtest/transactions/test',
        at: expect.any(Number)
      }
    })
  })
})

describe('POST: /v1/regtest/transactions', () => {
  describeFailValidations('/v1/regtest/transactions')

  it('should send valid txn', async () => {
    const aKey = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const bKey = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const hex = await createSignedTxnHex(10, 9.9999, aKey, bKey)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions',
      payload: {
        hex: hex
      }
    })

    const txid = await res.json().data
    expect(res.statusCode).toBe(201)
    expect(txid.length).toEqual(64)

    await container.generate(1)
    await expectTxn(txid, 9.9999, await bKey.publicKey())
  })

  it('should send valid txn with given maxFeeRate', async () => {
    const aKey = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const bKey = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const hex = await createSignedTxnHex(10, 9.995, aKey, bKey)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions',
      payload: {
        hex: hex,
        maxFeeRate: 0.05
      }
    })

    const txid = await res.json().data
    expect(res.statusCode).toBe(201)
    expect(txid.length).toEqual(64)

    await container.generate(1)
    await expectTxn(txid, 9.995, await bKey.publicKey())
  })

  it('should fail due to invalid txn', async () => {
    const hex = '0400000100881133bb11aa00cc'
    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions',
      payload: {
        hex: hex
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: {
        type: 'BadRequest',
        code: 400,
        url: '/v1/regtest/transactions',
        at: expect.any(Number)
      }
    })
  })

  it('should fail due to high fees', async () => {
    const hex = await createSignedTxnHex(10, 9)
    const res = await app.inject({
      method: 'POST',
      url: '/v1/regtest/transactions',
      payload: {
        hex: hex,
        maxFeeRate: 1
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({
      error: {
        type: 'BadRequest',
        code: 400,
        url: '/v1/regtest/transactions',
        at: expect.any(Number)
      }
    })
  })
})
