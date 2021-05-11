[![npm](https://img.shields.io/npm/v/@defichain/whale-api-client)](https://www.npmjs.com/package/@defichain/whale-api-client/v/latest)
[![npm@next](https://img.shields.io/npm/v/@defichain/whale-api-client/next)](https://www.npmjs.com/package/@defichain/whale-api-client/v/next)

# @defichain/whale-api-client

`@defichain/whale-api-client` implements `@defichain/jellyfish-api-core`
with [`JSON-RPC 1.0`](https://www.jsonrpc.org/specification_v1) specification.

Other than `jellyfish-api-core`, 2 other external dependencies are used with 4 deeply.

1. `cross-fetch` for an isomorphic fetch client compatible with RN, Node & browser.
   1. `node-fetch`
2. `abort-controller` for fetch abort signal implementation for request timeout.
   1. `event-target-shim`

## Development & Testing

As all RPC interfacing is implemented in `jellyfish-api-core`, this package development & testing only focus on the
[JSON-RPC 1.0](https://www.jsonrpc.org/specification_v1) specification implementation.
