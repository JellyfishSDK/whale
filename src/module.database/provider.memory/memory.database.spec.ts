import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/index'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'
import * as spec from '@src/module.database/database.spec/database.spec'

let database: MemoryDatabase

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule]
  }).compile()

  database = app.get<MemoryDatabase>(MemoryDatabase)
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
