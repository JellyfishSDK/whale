import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { ApiError } from './error.exception'

interface ErrorMessage {
  message: string
  code: number
  error?: any
  url: string
  at: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch (exception: ApiError, host: ArgumentsHost): any

  catch (exception: HttpException, host: ArgumentsHost): any

  catch (exception: unknown, host: ArgumentsHost): any

  catch (exception: ApiError | HttpException | unknown, host: ArgumentsHost): any {
    const request = host.switchToHttp().getRequest().raw
    const response = host.switchToHttp().getResponse()

    if (exception instanceof ApiError || exception instanceof HttpException) {
      const status = exception.getStatus()

      const exceptionResponse = exception.getResponse()

      return response.code(status).send({
        message: (exceptionResponse as ErrorMessage)?.message ?? exceptionResponse,
        error: (exceptionResponse as ErrorMessage)?.error,
        code: status,
        url: request.url,
        at: new Date().toISOString()
      })
    }

    return response.code(status).send({
      message: 'Unknown error',
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      url: request.url,
      at: new Date().toISOString()
    })
  }
}
