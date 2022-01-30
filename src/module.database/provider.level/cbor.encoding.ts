import { CodecEncoder } from 'level-codec'
import cbor from 'cbor'

/**
 * Faster & Smaller Value Codec for level.database.ts
 *
 * @see https://msgpack.org/
 * @see https://github.com/kawanet/msgpack-lite
 */
export const CborEncoding: CodecEncoder = {
  encode (val: any): any {
    return cbor.encode(val)
  },
  decode (val: any): any {
    return cbor.decode(val)
  },
  buffer: true,
  type: 'cbor'
}
