import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { ApiModule } from '@src/module-api'
import { DeFiDModule } from '@src/module.defid'
import configuration from '@src/configuration'
import { NetworkGuard } from '@src/guard.app'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    DeFiDModule.forRoot(),
    ApiModule
  ],
  providers: [
    // Setup global guard for server
    { provide: APP_GUARD, useClass: NetworkGuard }
  ]
})
export class AppModule {
}
