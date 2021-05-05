import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { ApiModule } from '@src/module.api'
import { DatabaseModule } from '@src/module.database/module'
import { DeFiDModule } from '@src/module.defid'
import { HealthModule } from '@src/module.health'
import { AppConfiguration } from '@src/app.configuration'

@Module({})
export class AppModule {
  static forRoot (provider?: string): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [AppConfiguration]
        }),
        ScheduleModule.forRoot(),
        DatabaseModule.forRoot(provider),
        DeFiDModule,
        HealthModule,
        ApiModule
      ]
    }
  }
}
