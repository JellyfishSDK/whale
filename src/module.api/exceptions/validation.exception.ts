import { HttpException, HttpStatus } from '@nestjs/common'
import { VALIDATION_ERROR } from '../constants'
import { AppErrorMessage } from '../interfaces'

export class ValidationError extends HttpException {
  constructor (error?: AppErrorMessage) {
    super(error ?? VALIDATION_ERROR.message, HttpStatus.BAD_REQUEST)
  }
}
