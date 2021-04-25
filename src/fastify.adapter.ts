import { FastifyAdapter } from '@nestjs/platform-fastify'
import { JellyfishJSON } from '@defichain/jellyfish-json'

/**
 * Creates a new FastifyAdapter that uses JellyfishJSON for JSON stringify and parse.
 */
export function newFastifyAdapter (): FastifyAdapter {
  const adapter = new FastifyAdapter()
  adapter.getInstance().setReplySerializer(payload => {
    return JellyfishJSON.stringify(payload)
  })
  adapter.getInstance().addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JellyfishJSON.parse(body as string, 'lossless')
      done(null, json)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })
  return adapter
}
