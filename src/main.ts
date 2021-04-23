import { NestFactory } from '@nestjs/core'
import { AppModule } from '@src/module.app'

/**
 * Bootstrap AppModule and start on port 3000
 */
async function bootstrap (): Promise<void> {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}

/* eslint-disable no-void */
void bootstrap()
