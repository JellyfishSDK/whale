import { MsgpackEncoding } from '@src/module.database/provider.level/msgpack.encoding'

it('should encode and decode into the same json object', async () => {
  const obj = {
    foo: 'bar',
    lighting: 0,
    thunder: ['storm', 'water'],
    within: {
      number: 1,
      bar: 'foo',
      objects: []
    }
  }

  const encoded = MsgpackEncoding.encode(obj)
  const decoded = MsgpackEncoding.decode(encoded)

  const jsonEncoded = Buffer.from(JSON.stringify(obj), 'utf-8')
  expect(jsonEncoded.length).toStrictEqual(101)
  expect(encoded.length).toStrictEqual(73)

  expect(decoded).toStrictEqual(obj)
})

it('should map undefined as null', () => {
  const obj = {
    foo: 'bar',
    a: null,
    b: undefined,
    c: [null, 'a'],
    d: {
      number: 1,
      bar: 'foo',
      e: null,
      f: undefined
    }
  }

  const encoded = MsgpackEncoding.encode(obj)
  const decoded = MsgpackEncoding.decode(encoded)

  expect(decoded).toStrictEqual({
    foo: 'bar',
    a: null,
    b: null,
    c: [null, 'a'],
    d: {
      number: 1,
      bar: 'foo',
      e: null,
      f: null
    }
  })
})
