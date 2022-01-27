import { CodecEncoder } from 'level-codec'
import msgpack from 'msgpack-lite'

/**
 * Faster & Smaller Value Codec for level.database.ts
 *
 * @see https://msgpack.org/
 * @see https://github.com/kawanet/msgpack-lite
 */
export const MsgpackEncoding: CodecEncoder = {
  encode (val: any): any {
    return msgpack.encode(val)
  },
  decode (val: any): any {
    return msgpack.decode(val)
  },
  buffer: true,
  type: 'msgpack'
}
