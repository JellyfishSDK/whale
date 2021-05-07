import { HttpException, HttpStatus } from '@nestjs/common'
import { VALIDATION_ERROR } from '../constants'
import { ErrorMessage } from '../interfaces'

export class ValidationError extends HttpException {
  constructor (error?: ErrorMessage) {
    super(error ?? VALIDATION_ERROR, HttpStatus.BAD_REQUEST)
  }
}
