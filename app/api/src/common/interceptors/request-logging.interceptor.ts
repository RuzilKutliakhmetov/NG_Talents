import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const started = Date.now();
    const requestId = randomUUID();
    response.setHeader('x-request-id', requestId);
    return next.handle().pipe(
      tap(() =>
        console.info(
          JSON.stringify({
            requestId,
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            duration: Date.now() - started,
          }),
        ),
      ),
    );
  }
}
