// import { Test, TestingModule } from '@nestjs/testing'
// import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
// import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
// import { OracleController } from '@src/module.api/oracle.controller'
//
// const container = new MasterNodeRegTestContainer()
// let client: JsonRpcClient
// let controller: OracleController
//
// beforeAll(async () => {
//   await container.start()
//   await container.waitForReady()
//   await container.waitForWalletCoinbaseMaturity()
//   client = new JsonRpcClient(await container.getCachedRpcUrl())
//
//   const app: TestingModule = await Test.createTestingModule({
//     controllers: [OracleController],
//     providers: [{ provide: JsonRpcClient, useValue: client }]
//   }).compile()
//   controller = app.get<OracleController>(OracleController)
// })
//
// afterAll(async () => {
//   await container.stop()
// })
//
// describe('list', () => {
//   it('should list', async () => {
//
//   })
//
//   it('should list with pagination', async () => {
//
//   })
//
//   it('should list empty object as out of range', async () => {
//
//   })
// })
//
// describe('get', () => {
//
// })
