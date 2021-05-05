import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { LevelDatabaseModule } from '@src/module.database/provider.level/module'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import * as spec from '@src/module.database/database.spec/specifications'

let database: LevelDatabase

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({
        database: {
          provider: 'level',
          level: { location: '.level/module.database/provider.level/level.database.spec.ts' }
        }
      })]
    }), LevelDatabaseModule]
  }).compile()

  database = app.get<LevelDatabase>(LevelDatabase)
})

beforeEach(async () => {
  await spec.setup(database)
})

afterEach(async () => {
  await spec.teardown(database)
})

it('should get by id', async () => {
  await spec.shouldGetById(database)
})

it('should get by partition key', async () => {
  await spec.shouldGetByPartitionKey(database)
})

it('should get by partition key and sort key', async () => {
  await spec.shouldGetByPartitionSortKey(database)
})

it('should delete and be deleted', async () => {
  await spec.shouldDelete(database)
})

it('should query by partition pagination', async () => {
  await spec.shouldQueryPartitionPagination(database)
})

it('should query partition sort pagination', async () => {
  await spec.shouldQueryPartitionSortPagination(database)
})

it('should query key space without colliding', async () => {
  await spec.shouldQueryKeySpaceWithoutColliding(database)
})

it('should query with asc desc', async () => {
  await spec.shouldQueryWithAscDesc(database)
})

describe('range operators', () => {
  it('should query with operator GT', async () => {
    await spec.shouldQueryWithOperatorGT(database)
  })

  it('should query with operator GTE', async () => {
    await spec.shouldQueryWithOperatorGTE(database)
  })

  it('should query with operator LT', async () => {
    await spec.shouldQueryWithOperatorLT(database)
  })

  it('should query with operator LTE', async () => {
    await spec.shouldQueryWithOperatorLTE(database)
  })

  it('should query with operator GT LT', async () => {
    await spec.shouldQueryWithOperatorGTLT(database)
  })

  it('should query with operator GTE LTE', async () => {
    await spec.shouldQueryWithOperatorGTELTE(database)
  })

  it('should query with operator GT LTE', async () => {
    await spec.shouldQueryWithOperatorGTLTE(database)
  })

  it('should query with operator GTE LT', async () => {
    await spec.shouldQueryWithOperatorGTELT(database)
  })
})
