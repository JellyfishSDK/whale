import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch (exception: HttpException, host: ArgumentsHost): any {
    const request = host.switchToHttp().getRequest().req
    const response = host.switchToHttp().getResponse()
    const status = exception.getStatus()

    const { statusCode, message } = exception.getResponse() as any
    const errorMessage = {
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString()
    }

    return response.code(status).send(errorMessage)
  }
}
