import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp } from '@src/e2e.module'
import { AnchorsController } from '@src/module.api/anchors.controller'
import { TestingGroup } from '@defichain/jellyfish-testing'

let tGroup: TestingGroup
let container: MasterNodeRegTestContainer
let app: NestFastifyApplication
let controller: AnchorsController

beforeAll(async () => {
  tGroup = TestingGroup.create(3)
  container = tGroup.group.get(0)

  await container.start()
  await tGroup.start()

  app = await createTestingApp(container)
  controller = app.get(AnchorsController)

  await setup()
})

afterAll(async () => {
  await app.close()
  await tGroup.group.stop()
})

async function setMockTime (offsetHour: number): Promise<void> {
  await tGroup.exec(async (testing: any) => {
    await testing.misc.offsetTimeHourly(offsetHour)
  })
}

async function setup (): Promise<void> {
  {
    const auths = await tGroup.get(0).container.call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(0)
  }

  const initOffsetHour = -12
  await setMockTime(initOffsetHour)

  for (let i = 0; i < 15; i += 1) {
    const { container } = tGroup.get(i % tGroup.length())
    await container.generate(1)
    await tGroup.waitForSync()
  }

  await tGroup.get(0).container.waitForAnchorTeams(tGroup.length())

  for (let i = 0; i < tGroup.length(); i += 1) {
    const { container } = tGroup.get(i % tGroup.length())
    const team = await container.call('getanchorteams')
    expect(team.auth.length).toStrictEqual(tGroup.length())
    expect(team.confirm.length).toStrictEqual(tGroup.length())
    expect(team.auth.includes(RegTestFoundationKeys[0].operator.address))
    expect(team.auth.includes(RegTestFoundationKeys[1].operator.address))
    expect(team.auth.includes(RegTestFoundationKeys[2].operator.address))
    expect(team.confirm.includes(RegTestFoundationKeys[0].operator.address))
    expect(team.confirm.includes(RegTestFoundationKeys[1].operator.address))
    expect(team.confirm.includes(RegTestFoundationKeys[2].operator.address))
  }

  await tGroup.anchor.generateAnchorAuths(2, initOffsetHour)

  await tGroup.get(0).container.waitForAnchorAuths(tGroup.length())

  for (let i = 0; i < tGroup.length(); i += 1) {
    const { container } = tGroup.get(i % tGroup.length())
    const auths = await container.call('spv_listanchorauths')
    expect(auths.length).toStrictEqual(2)
    expect(auths[0].signers).toStrictEqual(tGroup.length())
  }

  await tGroup.get(0).container.call('spv_setlastheight', [1])
  const anchor1 = await createAnchor()
  await tGroup.get(0).generate(1)

  await tGroup.get(0).container.call('spv_setlastheight', [2])
  const anchor2 = await createAnchor()
  await tGroup.get(0).generate(1)

  await tGroup.get(0).container.call('spv_setlastheight', [3])
  const anchor3 = await createAnchor()
  await tGroup.get(0).generate(1)

  await tGroup.get(0).container.call('spv_setlastheight', [4])
  const anchor4 = await createAnchor()
  await tGroup.get(0).generate(1)

  await tGroup.get(1).container.call('spv_sendrawtx', [anchor1.txHex])
  await tGroup.get(1).container.call('spv_sendrawtx', [anchor2.txHex])
  await tGroup.get(1).container.call('spv_sendrawtx', [anchor3.txHex])
  await tGroup.get(1).container.call('spv_sendrawtx', [anchor4.txHex])
  await tGroup.get(1).generate(1)
  await tGroup.waitForSync()

  await tGroup.get(0).container.call('spv_setlastheight', [6])
}

async function createAnchor (): Promise<any> {
  const rewardAddress = await tGroup.get(0).rpc.spv.getNewAddress()
  return await tGroup.get(0).rpc.spv.createAnchor([{
    txid: '11a276bb25585f6973a4dd68373cffff41dbcaddf12bbc1c2b489d1dc84564ee',
    vout: 2,
    amount: 15800,
    privkey: 'b0528d87cfdb09f72c9d10b7b3cc00727062d93537a3e8abcf1fde821d08b59d'
  }], rewardAddress)
}

describe('list', () => {
  it('should list anchors = 4', async () => {
    const response = await controller.list({ size: 4 })
    expect(response.data.length).toStrictEqual(4)

    expect(response.data[0]).toStrictEqual({
      id: '4',
      btc: {
        block: {
          height: 4,
          hash: '0000000000000001000000000000000100000000000000010000000000000001'
        },
        txn: {
          hash: expect.any(String)
        },
        confirmations: 3
      },
      dfi: {
        block: {
          height: 30,
          hash: expect.any(String)
        }
      },
      previousAnchor: '0000000000000000000000000000000000000000000000000000000000000000',
      rewardAddress: expect.any(String),
      signatures: 2,
      active: false,
      anchorCreationHeight: 90
    })
  })

  it('should test pagination with maxBtcHeight', async () => {
    const firstRequest = await controller.list({ size: 1 })
    expect(firstRequest.data.length).toStrictEqual(1)
    expect(firstRequest.page?.next).toStrictEqual('3')

    const secondRequest = await controller.list({
      size: 1,
      next:
      firstRequest.page?.next
    })
    expect(secondRequest.data.length).toStrictEqual(1)
    expect(secondRequest.page?.next).toStrictEqual('2')

    const thirdRequest = await controller.list({
      size: 1,
      next: secondRequest.page?.next
    })
    expect(thirdRequest.data.length).toStrictEqual(1)
    expect(thirdRequest.page?.next).toStrictEqual('1')

    const lastRequest = await controller.list({
      size: 2,
      next: thirdRequest.page?.next
    })

    expect(lastRequest.data.length).toStrictEqual(1)
    expect(lastRequest.page?.next).toStrictEqual(undefined)
  })
})
