import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Capturar no Sentry apenas erros 5xx e exceções não-HTTP
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setExtra('url', request.url);
        scope.setExtra('method', request.method);

        const user = (request as any).user;
        if (user?.id) {
          scope.setUser({ id: String(user.id) });
        }

        Sentry.captureException(exception);
      });

      this.logger.error(
        `[Sentry] Capturado: ${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Manter resposta padrão do NestJS
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          };

    response.status(status).json(body);
  }
}
