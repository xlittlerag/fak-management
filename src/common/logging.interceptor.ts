import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

const TRUNCATE_LIMIT = 20;

const SENSITIVE_HEADERS = new Set([
  'authorization', 'cookie', 'set-cookie', 'x-api-key',
]);

function truncate(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length > TRUNCATE_LIMIT) {
      return `[Array(${value.length})]`;
    }
    return value.map(truncate);
  }
  if (value !== null && typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = truncate(v);
    }
    return obj;
  }
  return value;
}

function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADERS.has(key.toLowerCase())) {
      safe[key] = value;
    }
  }
  return safe;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const correlationId = randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    const startTime = Date.now();

    const requestLog = {
      correlationId,
      method: req.method,
      url: req.originalUrl ?? req.url,
      query: truncate(req.query),
      headers: sanitizeHeaders(req.headers as Record<string, unknown>),
      body: truncate(req.body),
    };

    this.logger.log({ ...requestLog, msg: 'incoming request' });

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          this.logger.log({
            correlationId,
            method: req.method,
            url: req.originalUrl ?? req.url,
            statusCode,
            duration: `${duration}ms`,
            responseBody: truncate(responseBody),
            msg: 'request completed',
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          const statusCode = (error as Error & { status?: number }).status ?? 500;
          const logFn = statusCode >= 500 ? 'error' : 'warn';

          this.logger[logFn]({
            correlationId,
            method: req.method,
            url: req.originalUrl ?? req.url,
            statusCode,
            duration: `${duration}ms`,
            error: error.message,
            stack: error.stack,
            msg: 'request failed',
          });
        },
      }),
    );
  }
}
