import { createTestingApp, DelayedEunosPayaTestContainer, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasternodeMapper } from '@src/module.model/masternode'

describe('resign masternode (pre eunos paya)', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should index resign masternode', async () => {
    await container.generate(1)

    const blockchainInfo = await client.blockchain.getBlockchainInfo()
    console.log(JSON.stringify(blockchainInfo))

    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(1)

    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const masternodeMapper = app.get(MasternodeMapper)

    const masternode = await masternodeMapper.get(masternodeId)

    expect(masternode).not.toStrictEqual(undefined)

    const resignTx = await client.masternode.resignMasternode(masternodeId)

    await container.generate(1)
    const resignHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, resignHeight)

    const resignedMasternode = await masternodeMapper.get(masternodeId)

    expect(resignedMasternode?.resignHeight).toStrictEqual(resignHeight)
    expect(resignedMasternode?.resignTx).toStrictEqual(resignTx)
  })
})
