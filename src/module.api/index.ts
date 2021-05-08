import { APP_PIPE } from '@nestjs/core'
import { Module, ValidationPipe } from '@nestjs/common'
import { CallController } from '@src/module.api/call.controller'
import { HealthController } from '@src/module.api/health.controller'
import { TransactionsController } from '@src/module.api/transactions.controller'
import { BlockchainController } from '@src/module.api/blockchain.controller'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  controllers: [
    CallController,
    HealthController,
    TransactionsController,
    BlockchainController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ transform: true })
    }
  ]
})
export class ApiModule {
}
