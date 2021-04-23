import { Module } from '@nestjs/common'
import { CallController } from '@src/module-api/call.controller'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [],
  controllers: [CallController],
  providers: []
})
export class ApiModule {
}
