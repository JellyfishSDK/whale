import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TerminusModule } from '@nestjs/terminus'

import { ApiModule } from '@src/module.api'
import { DeFiDModule } from '@src/module.defid'
import configuration from '@src/app.configuration'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    DeFiDModule.forRoot(),
    TerminusModule,
    ApiModule
  ]
})
export class AppModule {
}
