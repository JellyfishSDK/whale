import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { AppErrorMessage } from '../interfaces'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch (exception: HttpException, host: ArgumentsHost): any {
    const request = host.switchToHttp().getRequest().req
    const response = host.switchToHttp().getResponse()
    const status = exception.getStatus()

    const err = exception.getResponse() as AppErrorMessage

    const message = typeof err !== 'string' ? err.message : err
    const statusCode = typeof err !== 'string' ? err.statusCode : HttpStatus.BAD_REQUEST
    const error = typeof err !== 'string' ? err?.error : undefined

    const errorMessage = {
      error,
      statusCode,
      message: message ?? 'Bad Request',
      url: request.url,
      at: new Date().toISOString()
    }

    return response.code(status).send(errorMessage)
  }
}
