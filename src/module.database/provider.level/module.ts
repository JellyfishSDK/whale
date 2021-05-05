import fs from 'fs'
import { Module } from '@nestjs/common'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { ConfigService } from '@nestjs/config'
import { LevelUp } from 'levelup'
import level from 'level'

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
      provide: 'LEVEL_UP',
      useFactory: (configService: ConfigService): LevelUp => {
        const location = configService.get('database.level.location', '.level/default')
        mkdir(location)
        return level(location)
      },
      inject: [ConfigService]
    }
  ]
})
export class LevelDatabaseModule {
}
