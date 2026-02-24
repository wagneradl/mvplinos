import { Module, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Module({})
export class SentryModule {
  private static readonly logger = new Logger(SentryModule.name);

  static forRoot() {
    const dsn = process.env.SENTRY_DSN;

    if (dsn) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
        enabled: true,
      });
      SentryModule.logger.log('Sentry inicializado com sucesso');
    } else {
      SentryModule.logger.warn(
        'SENTRY_DSN não configurado — error tracking desabilitado',
      );
    }

    return {
      module: SentryModule,
      global: true,
    };
  }
}
