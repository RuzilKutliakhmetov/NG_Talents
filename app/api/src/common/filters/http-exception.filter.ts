import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const data =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    response.status(status).json({
      statusCode: status,
      code:
        data.code ?? (status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'),
      message:
        data.message ??
        (status === 500
          ? 'Internal server error'
          : exception instanceof Error
            ? exception.message
            : 'Error'),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
