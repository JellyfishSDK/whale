import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request } from 'express'
import { ConfigService } from '@nestjs/config'

/**
 * Whale endpoints are exposed as /v1.0/:network/...
 * Each whale server can only run a single network for separation of concerns.
 * This provides global request guard to ensure request are routed to the correct endpoint.
 */
@Injectable()
export class NetworkGuard implements CanActivate {
  static available: string[] = [
    'mainnet',
    'testnet',
    'regtest'
  ]

  private readonly network: string

  constructor (private readonly configService: ConfigService) {
    const network = configService.get<string>('network')
    if (network === undefined || !NetworkGuard.available.includes(network)) {
      throw new Error('NetworkGuard: defi.network is not configured')
    }
    this.network = network
  }

  canActivate (context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    return request.params.network !== this.network
  }
}
