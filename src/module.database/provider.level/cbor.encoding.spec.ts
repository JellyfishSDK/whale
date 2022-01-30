import { CborEncoding } from '@src/module.database/provider.level/cbor.encoding'

it('should encode and decode into the same json object', async () => {
  const obj = {
    foo: 'bar',
    bar: undefined,
    stool: null,
    lighting: 0,
    thunder: ['storm', 'water'],
    within: {
      number: 1,
      bar: 'foo',
      objects: []
    }
  }

  const encoded = CborEncoding.encode(obj)
  const decoded = CborEncoding.decode(encoded)

  const json = Buffer.from(JSON.stringify(obj), 'utf-8')
  expect(decoded).toStrictEqual(obj)

  expect(encoded.length).toBeLessThan(json.length)
  expect(json.length).toStrictEqual(114)
  expect(encoded.length).toStrictEqual(85)
})
