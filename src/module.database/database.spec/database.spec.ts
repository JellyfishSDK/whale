import { Database, SortOrder } from '@src/module.database/database'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { PartitionMapping, PartitionSortMapping } from '@src/module.database/database.spec/_model.spec'
import { PARTITION_SORTS, PARTITIONS } from '@src/module.database/database.spec/_fixtures.spec'

/**
 * Setup everything that is required to test database specification
 */
export async function setup (database: Database): Promise<void> {
  for (const data of PARTITIONS) {
    await database.put(PartitionMapping, data)
  }

  for (const data of PARTITION_SORTS) {
    await database.put(PartitionSortMapping, data)
  }
}

/**
 * Teardown all persisted data in each test scope
 */
export async function teardown (database: Database): Promise<void> {
  const levelDb = database as LevelDatabase
  await levelDb.clear()
}

export async function shouldGetById (database: Database): Promise<void> {
  for (const data of PARTITIONS) {
    const model = await database.get(PartitionMapping, data.id)
    expect(model).toEqual(data)
  }

  for (const data of PARTITION_SORTS) {
    const model = await database.get(PartitionSortMapping, data.id)
    expect(model).toEqual(data)
  }
}

export async function shouldGetByPartitionKey (database: Database): Promise<void> {
  const index = PartitionMapping.index
  for (const data of PARTITIONS) {
    const partitionA = await database.get(index.partition_a, data.a)
    expect(partitionA).toEqual(data)

    const partitionB = await database.get(index.partition_b, data.b)
    expect(partitionB).toEqual(data)

    const compositeC = await database.get(index.composite_c, data.c_partition, data.c_sort)
    expect(compositeC).toEqual(data)
  }
}

export async function shouldGetByPartitionSortKey (database: Database): Promise<void> {
  const index = PartitionSortMapping.index

  for (const data of PARTITION_SORTS) {
    const compositeA = await database.get(index.composite_a, data.a_partition, data.a_sort)
    expect(compositeA).toEqual(data)

    const compositeB = await database.get(index.composite_b, data.b_partition, data.b_sort)
    expect(compositeB).toEqual(data)
  }
}

/**
 * Test all indexes specified is deleted
 */
export async function shouldDelete (database: Database): Promise<void> {
  for (const data of PARTITIONS) {
    await database.delete(PartitionMapping, data.id)

    const partitionA = await database.get(PartitionMapping.index.partition_a, data.a)
    expect(partitionA).toBeUndefined()

    const partitionB = await database.get(PartitionMapping.index.partition_b, data.b)
    expect(partitionB).toBeUndefined()

    const compositeC = await database.get(PartitionMapping.index.composite_c, data.c_partition, data.c_sort)
    expect(compositeC).toBeUndefined()
  }

  for (const data of PARTITION_SORTS) {
    await database.delete(PartitionSortMapping, data.id)

    const compositeA = await database.get(PartitionSortMapping.index.composite_a, data.a_partition, data.a_sort)
    expect(compositeA).toBeUndefined()

    const compositeB = await database.get(PartitionSortMapping.index.composite_b, data.b_partition, data.b_sort)
    expect(compositeB).toBeUndefined()
  }
}

export async function shouldQueryPartitionPagination (database: Database): Promise<void> {
  const window43 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC
  })
  expect(window43.length).toEqual(2)
  expect(window43[0]).toEqual(PARTITIONS[3])
  expect(window43[1]).toEqual(PARTITIONS[2])

  const window32 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC,
    lt: window43[0].a
  })
  expect(window32.length).toEqual(2)
  expect(window32[0]).toEqual(PARTITIONS[2])
  expect(window32[1]).toEqual(PARTITIONS[1])

  const window21 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC,
    lt: window32[0].a
  })
  expect(window21.length).toEqual(2)
  expect(window21[0]).toEqual(PARTITIONS[1])
  expect(window21[1]).toEqual(PARTITIONS[0])

  const window11 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC,
    lt: window21[0].a
  })
  expect(window11.length).toEqual(1)
  expect(window11[0]).toEqual(PARTITIONS[0])
}

export async function shouldQueryPartitionSortPagination (database: Database): Promise<void> {
  const window43 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC
  })
  expect(window43.length).toEqual(2)
  expect(window43[0].a_partition).toEqual('1000')
  expect(window43[0].a_sort).toEqual('2000')
  expect(window43[1].a_partition).toEqual('1000')
  expect(window43[1].a_sort).toEqual('1000')

  const window32 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC,
    lt: window43[0].a_sort
  })
  expect(window32.length).toEqual(2)
  expect(window32[0].a_partition).toEqual('1000')
  expect(window32[0].a_sort).toEqual('1000')
  expect(window32[1].a_partition).toEqual('1000')
  expect(window32[1].a_sort).toEqual('0002')

  const window21 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC,
    lt: window32[0].a_sort
  })
  expect(window21.length).toEqual(2)
  expect(window21[0].a_partition).toEqual('1000')
  expect(window21[0].a_sort).toEqual('0002')
  expect(window21[1].a_partition).toEqual('1000')
  expect(window21[1].a_sort).toEqual('0001')

  const window11 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC,
    lt: window21[0].a_sort
  })
  expect(window11.length).toEqual(1)
  expect(window11[0].a_partition).toEqual('1000')
  expect(window11[0].a_sort).toEqual('0001')
}

export async function shouldQueryKeySpaceWithoutColliding (database: Database): Promise<void> {
  const all = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: 'nothing',
    limit: 100,
    order: SortOrder.ASC
  })
  expect(all.length).toEqual(0)

  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC
  })
  expect(slice.length).toEqual(4)
  expect(slice[0].b_partition).toEqual(2000)
  expect(slice[0].b_sort).toEqual(1000)

  expect(slice[3].b_partition).toEqual(2000)
  expect(slice[3].b_sort).toEqual(4000)
}

export async function shouldQueryWithAscDesc (database: Database): Promise<void> {
  const partitionADesc = await database.query(PartitionMapping.index.partition_a, {
    limit: 100,
    order: SortOrder.DESC
  })
  expect(partitionADesc.length).toEqual(4)
  expect(partitionADesc[0].a).toBe('0003')
  expect(partitionADesc[1].a).toBe('0002')
  expect(partitionADesc[2].a).toBe('0001')
  expect(partitionADesc[3].a).toBe('0000')

  const partitionAAsc = await database.query(PartitionMapping.index.partition_a, {
    limit: 100,
    order: SortOrder.ASC
  })
  expect(partitionAAsc.length).toEqual(4)
  expect(partitionAAsc[0].a).toBe('0000')
  expect(partitionAAsc[1].a).toBe('0001')
  expect(partitionAAsc[2].a).toBe('0002')
  expect(partitionAAsc[3].a).toBe('0003')

  const compositeBDesc = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC
  })
  expect(compositeBDesc.length).toEqual(4)
  expect(compositeBDesc[0].b_sort).toBe(4000)
  expect(compositeBDesc[1].b_sort).toBe(3000)
  expect(compositeBDesc[2].b_sort).toBe(2000)
  expect(compositeBDesc[3].b_sort).toBe(1000)

  const compositeBAsc = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC
  })
  expect(compositeBAsc.length).toEqual(4)
  expect(compositeBAsc[0].b_sort).toBe(1000)
  expect(compositeBAsc[1].b_sort).toBe(2000)
  expect(compositeBAsc[2].b_sort).toBe(3000)
  expect(compositeBAsc[3].b_sort).toBe(4000)
}

export async function shouldQueryWithOperatorGT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gt: 1000
  })
  expect(slice.length).toEqual(3)
  expect(slice[0].b_sort).toEqual(2000)
  expect(slice[1].b_sort).toEqual(3000)
  expect(slice[2].b_sort).toEqual(4000)
}

export async function shouldQueryWithOperatorGTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gte: 2000
  })
  expect(slice.length).toEqual(3)
  expect(slice[0].b_sort).toEqual(2000)
  expect(slice[1].b_sort).toEqual(3000)
  expect(slice[2].b_sort).toEqual(4000)
}

export async function shouldQueryWithOperatorLT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC,
    lt: 3000
  })
  expect(slice.length).toEqual(2)
  expect(slice[0].b_sort).toEqual(2000)
  expect(slice[1].b_sort).toEqual(1000)
}

export async function shouldQueryWithOperatorLTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC,
    lte: 3000
  })
  expect(slice.length).toEqual(3)
  expect(slice[0].b_sort).toEqual(3000)
  expect(slice[1].b_sort).toEqual(2000)
  expect(slice[2].b_sort).toEqual(1000)
}

export async function shouldQueryWithOperatorGTLT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gt: 1000,
    lt: 4000
  })
  expect(slice.length).toEqual(2)
  expect(slice[0].b_sort).toEqual(2000)
  expect(slice[1].b_sort).toEqual(3000)
}

export async function shouldQueryWithOperatorGTELTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gte: 1000,
    lte: 3000
  })
  expect(slice.length).toEqual(3)
  expect(slice[0].b_sort).toEqual(1000)
  expect(slice[1].b_sort).toEqual(2000)
  expect(slice[2].b_sort).toEqual(3000)
}

export async function shouldQueryWithOperatorGTLTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC,
    gt: 1000,
    lte: 3000
  })
  expect(slice.length).toEqual(2)
  expect(slice[0].b_sort).toEqual(3000)
  expect(slice[1].b_sort).toEqual(2000)
}

export async function shouldQueryWithOperatorGTELT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gte: 1000,
    lt: 3000
  })
  expect(slice.length).toEqual(2)
  expect(slice[0].b_sort).toEqual(1000)
  expect(slice[1].b_sort).toEqual(2000)
}
