import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createSignedTxnHex } from '@defichain/testing'
import { TransactionsController } from '@src/module.api/transaction.controller'
import { Bech32, Elliptic, HRP } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'
import { BadRequestApiException } from '@src/module.api/_core/api.error'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'

describe('transactions', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: TransactionsController
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    app = await createTestingApp(container)
    controller = app.get<TransactionsController>(TransactionsController)
    client = new JsonRpcClient(await container.getCachedRpcUrl())

    await waitForIndexedHeight(app, 100)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  async function expectTxn (txid: string, amount: number, pubKey: Buffer): Promise<void> {
    const details = await container.call('gettxout', [txid, 0])

    expect(details.value.toString(10)).toStrictEqual(amount.toString())
    expect(details.scriptPubKey.addresses[0]).toStrictEqual(
      Bech32.fromPubKey(pubKey, RegTest.bech32.hrp as HRP)
    )
  }

  describe('test', () => {
    it('should accept valid txn', async () => {
      const hex = await createSignedTxnHex(container, 10, 9.9999)
      await controller.test({
        hex: hex
      })
    })

    it('should accept valid txn with given maxFeeRate', async () => {
      const hex = await createSignedTxnHex(container, 10, 9.995)
      await controller.test({
        hex: hex,
        maxFeeRate: 0.05
      })
    })

    it('should throw BadRequestError due to invalid txn', async () => {
      expect.assertions(2)
      try {
        await controller.test({ hex: '0400000100881133bb11aa00cc' })
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestApiException)
        expect(err.response.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          message: 'Transaction decode failed',
          at: expect.any(Number)
        })
      }
    })

    it('should throw BadRequestError due to high fees', async () => {
      const hex = await createSignedTxnHex(container, 10, 9)
      expect.assertions(2)
      try {
        await controller.test({
          hex: hex, maxFeeRate: 1.0
        })
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestApiException)
        expect(err.response.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          at: expect.any(Number),
          message: 'Transaction is not allowed to be inserted'
        })
      }
    })
  })

  describe('send', () => {
    it('should send valid txn and validate tx out', async () => {
      const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
      const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

      const hex = await createSignedTxnHex(container, 10, 9.9999, { aEllipticPair: aPair, bEllipticPair: bPair })
      const txid = await controller.send({
        hex: hex
      })

      await container.generate(1)
      await expectTxn(txid, 9.9999, await bPair.publicKey())
    })

    it('should send valid txn with given maxFeeRate and validate tx out', async () => {
      const aPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
      const bPair = Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))

      const hex = await createSignedTxnHex(container, 10, 9.995, { aEllipticPair: aPair, bEllipticPair: bPair })
      const txid = await controller.send({
        hex: hex,
        maxFeeRate: 0.05
      })

      await container.generate(1)
      await expectTxn(txid, 9.995, await bPair.publicKey())
    })

    it('should throw BadRequestException due to invalid txn', async () => {
      expect.assertions(2)
      try {
        await controller.send({
          hex: '0400000100881133bb11aa00cc'
        })
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestApiException)
        expect(err.response.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          at: expect.any(Number),
          message: 'Transaction decode failed'
        })
      }
    })

    it('should throw BadRequestException due to high fees', async () => {
      const hex = await createSignedTxnHex(container, 10, 9)
      expect.assertions(2)
      try {
        await controller.send({
          hex: hex, maxFeeRate: 1
        })
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestApiException)
        expect(err.response.error).toStrictEqual({
          code: 400,
          type: 'BadRequest',
          at: expect.any(Number),
          message: 'Absurdly high fee'
        })
      }
    })
  })

  describe('estimateFeeRate', () => {
    it('should have fee of 0.00005 and not 0.00005 after adding activity', async () => {
      const before = await controller.estimateFee(10)
      expect(before).toStrictEqual(0.00005000)

      for (let i = 0; i < 10; i++) {
        for (let x = 0; x < 20; x++) {
          await client.wallet.sendToAddress('bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r', 0.1, {
            subtractFeeFromAmount: true,
            avoidReuse: false
          })
        }
        await container.generate(1)
      }
      const after = await controller.estimateFee(10)
      expect(after).not.toStrictEqual(0.00005000)
    })
  })

  describe('getTransaction', () => {
    let txid: string
    let height: number

    async function setup (): Promise<void> {
      const address = await container.getNewAddress()
      const metadata = {
        symbol: 'ETH',
        name: 'ETH',
        isDAT: true,
        mintable: true,
        tradeable: true,
        collateralAddress: address
      }
      txid = await container.call('createtoken', [metadata])

      await container.generate(1)

      height = await container.call('getblockcount')
    }

    beforeAll(async () => {
      await setup()
    })

    it('should get a single transaction', async () => {
      await waitForIndexedHeight(app, height)

      const transaction = await controller.get(txid)
      expect(transaction).toStrictEqual({
        id: txid,
        block: {
          hash: expect.any(String),
          height
        },
        txid,
        hash: txid,
        version: expect.any(Number),
        size: expect.any(Number),
        vSize: expect.any(Number),
        weight: expect.any(Number),
        lockTime: expect.any(Number),
        vinCount: expect.any(Number),
        voutCount: expect.any(Number)
      })
    })

    it('should return undefined for invalid transaction id ', async () => {
      await waitForIndexedHeight(app, height)
      const transaction = await controller.get('invalidtransactionId')
      expect(transaction).toStrictEqual(undefined)
    })
  })
})
