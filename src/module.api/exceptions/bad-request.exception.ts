import { HttpException, HttpStatus } from '@nestjs/common'
import { BAD_REQUEST_ERROR } from '../constants'
import { ErrorMessage } from '../interfaces'

export class HttpBadRequestError extends HttpException {
  constructor (error?: ErrorMessage) {
    super(error ?? BAD_REQUEST_ERROR, HttpStatus.BAD_REQUEST)
  }
}
