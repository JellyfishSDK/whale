import { HttpException, HttpStatus } from '@nestjs/common'

export class ApiError extends HttpException {
}

export class BadRequestError extends ApiError {
  static DEFAULT_MESSAGE = 'The request could not be understood by the server due to malformed request.'

  constructor (message?: string) {
    super(message ?? BadRequestError.DEFAULT_MESSAGE, HttpStatus.BAD_REQUEST)
  }
}
