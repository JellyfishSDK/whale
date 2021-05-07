import { HttpException, HttpStatus } from '@nestjs/common'
import { BAD_REQUEST_ERROR } from '../constants'
import { AppErrorMessage } from '../interfaces'

export class HttpBadRequestError extends HttpException {
  constructor (error?: AppErrorMessage) {
    super(error ?? BAD_REQUEST_ERROR.message, HttpStatus.BAD_REQUEST)
  }
}
