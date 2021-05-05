import fs from 'fs'
import { Module } from '@nestjs/common'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { ConfigService } from '@nestjs/config'

/**
 * LevelUp will fail to create if directory does not exist.
 */
function mkdir (location: string): void {
  if (fs.existsSync(location)) {
    return
  }
  fs.mkdirSync(location, { recursive: true })
}

@Module({
  providers: [
    LevelDatabase,
    {
      provide: 'LEVEL_UP_LOCATION',
      useFactory: (configService: ConfigService): string => {
        const location = configService.get(
          'database.level.location',
          `.level/unnamed/${Date.now()}`
        )
        mkdir(location)
        return location
      },
      inject: [ConfigService]
    }
  ],
  exports: [
    'LEVEL_UP_LOCATION'
  ]
})
export class LevelDatabaseModule {
}
