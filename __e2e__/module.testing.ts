import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from '@src/module.app'
import { ConfigService } from '@nestjs/config'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { newFastifyAdapter } from '@src/adapter.fastify'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

class TestConfigService extends ConfigService {
  constructor (rpcUrl: string) {
    super({
      defid: {
        url: rpcUrl
      },
      network: 'regtest'
    })
  }
}

async function createTestingModule (container: MasterNodeRegTestContainer): Promise<TestingModule> {
  const url = await container.getCachedRpcUrl()

  const builder = Test.createTestingModule({
    imports: [AppModule]
  })

  return await builder
    .overrideProvider(ConfigService).useValue(new TestConfigService(url))
    .compile()
}

/**
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 * Returns a INestApplication that is initialized and ready for e2e testing.
 *
 * @param {MasterNodeRegTestContainer} container to connect TestingModule to
 * @return Promise<INestApplication> that is initialized
 */
export async function createTestingApp (container: MasterNodeRegTestContainer): Promise<NestFastifyApplication> {
  const module = await createTestingModule(container)
  const app = module.createNestApplication<NestFastifyApplication>(
    newFastifyAdapter({
      logger: false
    })
  )
  await app.init()
  return app
}
