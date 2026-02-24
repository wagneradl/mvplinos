import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class StructuredLoggerService extends ConsoleLogger {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  log(message: any, context?: string) {
    if (this.isProduction) {
      this.printJson('log', message, context);
    } else {
      super.log(message, context);
    }
  }

  error(message: any, stack?: string, context?: string) {
    if (this.isProduction) {
      this.printJson('error', message, context, { stack });
    } else {
      super.error(message, stack, context);
    }
  }

  warn(message: any, context?: string) {
    if (this.isProduction) {
      this.printJson('warn', message, context);
    } else {
      super.warn(message, context);
    }
  }

  debug(message: any, context?: string) {
    if (this.isProduction) {
      this.printJson('debug', message, context);
    } else {
      super.debug(message, context);
    }
  }

  /**
   * Log estruturado com dados extras de negócio.
   */
  logWithContext(
    level: 'log' | 'error' | 'warn' | 'debug',
    message: string,
    context: string,
    extra?: Record<string, any>,
  ) {
    if (this.isProduction) {
      this.printJson(level, message, context, extra);
    } else {
      const extraStr = extra ? ` ${JSON.stringify(extra)}` : '';
      switch (level) {
        case 'error':
          super.error(`${message}${extraStr}`, undefined, context);
          break;
        case 'warn':
          super.warn(`${message}${extraStr}`, context);
          break;
        case 'debug':
          super.debug(`${message}${extraStr}`, context);
          break;
        default:
          super.log(`${message}${extraStr}`, context);
      }
    }
  }

  private printJson(
    level: string,
    message: any,
    context?: string,
    extra?: Record<string, any>,
  ) {
    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(extra && extra),
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}
