import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import {
  setup,
  shouldDelete,
  shouldGetById,
  shouldGetByPartitionKey,
  shouldGetByPartitionSortKey,
  shouldQueryKeySpaceWithoutColliding,
  shouldQueryPartitionPagination,
  shouldQueryPartitionSortPagination,
  shouldQueryWithAscDesc,
  shouldQueryWithOperatorGT,
  shouldQueryWithOperatorGTE,
  shouldQueryWithOperatorGTELT,
  shouldQueryWithOperatorGTELTE,
  shouldQueryWithOperatorGTLT,
  shouldQueryWithOperatorGTLTE,
  shouldQueryWithOperatorLT,
  shouldQueryWithOperatorLTE,
  teardown
} from '@src/module.database/database.spec/database.spec'
import { LevelDatabaseModule } from '@src/module.database/provider.level/index'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'

let database: LevelDatabase

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({
        database: {
          provider: 'level', level: { location: '.level/spec-ts' }
        }
      })]
    }), LevelDatabaseModule]
  }).compile()

  database = app.get<LevelDatabase>(LevelDatabase)
})

beforeEach(async () => {
  await setup(database)
})

afterEach(async () => {
  await teardown(database)
})

it('should get by id', async () => {
  await shouldGetById(database)
})

it('should get by partition key', async () => {
  await shouldGetByPartitionKey(database)
})

it('should get by partition key and sort key', async () => {
  await shouldGetByPartitionSortKey(database)
})

it('should delete and be deleted', async () => {
  await shouldDelete(database)
})

it('should query by partition pagination', async () => {
  await shouldQueryPartitionPagination(database)
})

it('should query partition sort pagination', async () => {
  await shouldQueryPartitionSortPagination(database)
})

it('should query key space without colliding', async () => {
  await shouldQueryKeySpaceWithoutColliding(database)
})

it('should query with asc desc', async () => {
  await shouldQueryWithAscDesc(database)
})

describe('range operators', () => {
  it('should query with operator GT', async () => {
    await shouldQueryWithOperatorGT(database)
  })

  it('should query with operator GTE', async () => {
    await shouldQueryWithOperatorGTE(database)
  })

  it('should query with operator LT', async () => {
    await shouldQueryWithOperatorLT(database)
  })

  it('should query with operator LTE', async () => {
    await shouldQueryWithOperatorLTE(database)
  })

  it('should query with operator GT LT', async () => {
    await shouldQueryWithOperatorGTLT(database)
  })

  it('should query with operator GTE LTE', async () => {
    await shouldQueryWithOperatorGTELTE(database)
  })

  it('should query with operator GT LTE', async () => {
    await shouldQueryWithOperatorGTLTE(database)
  })

  it('should query with operator GTE LT', async () => {
    await shouldQueryWithOperatorGTELT(database)
  })
})
