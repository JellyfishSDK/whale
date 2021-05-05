import { Module } from '@nestjs/common'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'

@Module({
  providers: [
    MemoryDatabase
  ]
})
export class MemoryDatabaseModule {
}
