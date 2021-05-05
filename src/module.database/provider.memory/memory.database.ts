import levelup from 'levelup'
import memdown from 'memdown'
import { LevelUpDatabase } from '@src/module.database/provider.level/level.database'

/**
 * MemoryDatabase uses [Level/memdown](https://github.com/Level/memdown)
 */
export class MemoryDatabase extends LevelUpDatabase {
  constructor () {
    super(levelup(memdown()))
  }
}
