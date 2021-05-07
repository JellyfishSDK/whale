import { HttpStatus } from '@nestjs/common'
import { ErrorMessage } from '../interfaces'

export const BAD_GATEWAY_ERROR: ErrorMessage = {
  statusCode: HttpStatus.BAD_GATEWAY,
  message: 'Bad gateway, received an invalid response from the upstream server.'
}

export const TIMEOUT_ERROR: ErrorMessage = {
  statusCode: HttpStatus.REQUEST_TIMEOUT,
  message: 'Request from client to server has timeout.'
}

export const CONFLICT_ERROR: ErrorMessage = {
  statusCode: HttpStatus.CONFLICT,
  message: 'The request could not be completed due to a conflict with the current state of the resource.'
}

export const NOT_FOUND_ERROR: ErrorMessage = {
  statusCode: HttpStatus.NOT_FOUND,
  message: 'Resource not found.'
}

export const BAD_REQUEST_ERROR: ErrorMessage = {
  statusCode: HttpStatus.BAD_REQUEST,
  message: 'The request could not be understood by the server due to malformed request'
}

export const FORBIDDEN_ERROR: ErrorMessage = {
  statusCode: HttpStatus.FORBIDDEN,
  message: 'The server understood the request, but is refusing to fulfill it.'
}

export const VALIDATION_ERROR: ErrorMessage = {
  statusCode: HttpStatus.BAD_REQUEST,
  message: 'Request body contains error.'
}
