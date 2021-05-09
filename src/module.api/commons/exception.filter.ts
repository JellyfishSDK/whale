import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'

interface ErrorMessage {
  message: string
  statusCode: number
  error?: any
  url: string
  at: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch (exception: HttpException, host: ArgumentsHost): any

  catch (exception: unknown, host: ArgumentsHost): any

  catch (exception: HttpException | unknown, host: ArgumentsHost): any {
    const request = host.switchToHttp().getRequest().raw
    const response = host.switchToHttp().getResponse()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()

      if (typeof exception.getResponse() === 'string') {
        const message = exception.getResponse() as string
        const errorMessage = {
          message,
          code: status,
          url: request.url,
          at: new Date().toISOString()
        }

        return response.code(status).send(errorMessage)
      }

      const exceptionResponse = exception.getResponse() as ErrorMessage
      const errorMessage = {
        message: exceptionResponse.message,
        error: exceptionResponse.error,
        code: status,
        url: request.url,
        at: new Date().toISOString()
      }

      return response.code(status).send(errorMessage)
    }

    return response.code(status).send({
      message: 'Unknown error',
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      url: request.url,
      at: new Date().toISOString()
    })
  }
}
