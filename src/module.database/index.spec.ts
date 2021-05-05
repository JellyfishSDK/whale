import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from '@src/module.database/module'
import { Database } from '@src/module.database/database'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'

describe('provided module: level', () => {
  let app: TestingModule
  let database: Database

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({
          database: { provider: 'level' }
        })]
      }), DatabaseModule]
    }).compile()

    database = app.get<Database>(Database)
  })

  it('dynamically injected database should be level database', () => {
    expect(database instanceof LevelDatabase).toBe(true)
  })

  it('should be a singleton module', () => {
    const a = app.get<Database>(Database)
    const b = app.get<Database>(Database)
    expect(a).toEqual(b)
  })
})

describe('provided module: memory', () => {
  let app: TestingModule
  let database: Database

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ database: { provider: 'memory' } })]
      }), DatabaseModule]
    }).compile()

    database = app.get<Database>(Database)
  })

  it('dynamically injected database should be memory database', () => {
    expect(database instanceof MemoryDatabase).toBe(true)
  })

  it('should be a singleton module', () => {
    const a = app.get<Database>(Database)
    const b = app.get<Database>(Database)
    expect(a).toEqual(b)
  })
})

describe('provided module: invalid', () => {
  it('should fail module instantiation as database provider is invalid', async () => {
    const initModule = async (): Promise<void> => {
      await Test.createTestingModule({
        imports: [ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ database: { provider: 'invalid' } })]
        }), DatabaseModule]
      }).compile()
    }

    await expect(initModule)
      .rejects.toThrow('bootstrapping error: invalid database.provider - invalid')
  })
})
