/**
 * A clone from script.e2e (activity part only). Ensure all feature carried forward to v2.
 * Non utxo (Dftx) activities indexer has (extended) test case under src/model/script.activity.v2 for each indexed DfTx type.
 */

import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityV2Mapper } from '@src/module.model/script.activity.v2'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  app = await createTestingApp(container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

/* eslint-disable @typescript-eslint/no-non-null-assertion */

async function expectActivitiesV2 (scriptHex: string): Promise<void> {
  const hid = HexEncoder.asSHA256(scriptHex)
  const activityV2Mapper = app.get(ScriptActivityV2Mapper)
  const activities = await activityV2Mapper.query(hid, 100)

  for (const item of activities) {
    expect(item.hid).toStrictEqual(hid)
    expect(item.category).toStrictEqual('utxo')
    expect(item.dftx).toStrictEqual(undefined)
    expect(item.utxo?.txid).toStrictEqual(item.txid)
    expect(item.script.hex).toStrictEqual(scriptHex)
    expect(Number.parseFloat(item.value)).toBeGreaterThanOrEqual(0)
  }
}

describe('76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac', () => {
  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'

  it('should wait for block height 0', async () => {
    await waitForIndexedHeight(app, 0)
    await expectActivitiesV2(scriptHex)
  })

  it('should wait for block height 1', async () => {
    await waitForIndexedHeight(app, 1)
    await expectActivitiesV2(scriptHex)
  })

  it('should wait for block height 2', async () => {
    await waitForIndexedHeight(app, 2)
    await expectActivitiesV2(scriptHex)
  })
})
