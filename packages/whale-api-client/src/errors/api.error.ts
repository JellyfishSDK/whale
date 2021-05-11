import { HttpStatus } from '@nestjs/common'
import { ApiResponse } from '../whale.api.client'
import { WhaleApiValidationException } from './api.validation.exception'

export enum WhaleApiErrorType {
  ValidationError = 'ValidationError',
  BadRequest = 'BadRequest',
  NotFound = 'NotFound',
  Forbidden = 'Forbidden',
  Unauthorized = 'Unauthorized',
  BadGateway = 'BadGateway',
  TimeoutError = 'TimeoutError',
  UnknownError = 'UnknownError',
}

export interface WhaleApiError {
  code: HttpStatus
  type: WhaleApiErrorType
  at: number
  message?: string
  url?: string
}

/**
 * Serialized exception from DeFi Whale
 */
export class WhaleApiException extends Error {
  constructor (readonly error: WhaleApiError) {
    super(`${error.code} - ${error.type} ${WhaleApiException.url(error)}${WhaleApiException.message(error)}`)
  }

  static url ({ url }: WhaleApiError): string {
    return url !== undefined && url !== null ? `(${url})` : ''
  }

  static message ({ message }: WhaleApiError): string {
    return message !== undefined && message !== null ? `: ${message}` : ''
  }
}

/**
 * @param {ApiResponse} response to check and raise error if any
 * @throws {WhaleApiException} raised error
 */
export function raiseIfError (response: ApiResponse<any>): void {
  const error = response.error
  if (error === undefined) {
    return
  }

  if (error.code === 422 && error.type === WhaleApiErrorType.ValidationError) {
    throw new WhaleApiValidationException(error)
  }

  throw new WhaleApiException(error)
}
