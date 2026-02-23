/**
 * Utilitário para logs mais detalhados e facilitação de diagnóstico
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /**
   * Prefixo para todos os logs deste logger
   */
  prefix?: string;

  /**
   * Se deve incluir timestamp nos logs
   */
  includeTimestamp?: boolean;

  /**
   * Nível mínimo de log (logs abaixo deste nível não serão mostrados)
   */
  minLevel?: LogLevel;

  /**
   * Se deve enviar logs para o servidor ou serviço de monitoramento
   * (futura implementação)
   */
  reportToServer?: boolean;
}

// Ordenação dos níveis de log para comparação
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private prefix: string;
  private includeTimestamp: boolean;
  private minLevel: LogLevel;
  private reportToServer: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.includeTimestamp = options.includeTimestamp !== false;
    this.minLevel = options.minLevel || 'debug';
    this.reportToServer = options.reportToServer || false;
  }

  /**
   * Formata a mensagem de log com prefixo e timestamp
   */
  private formatMessage(message: string): string {
    let formattedMessage = '';

    if (this.includeTimestamp) {
      formattedMessage += `[${new Date().toISOString()}] `;
    }

    if (this.prefix) {
      formattedMessage += `[${this.prefix}] `;
    }

    formattedMessage += message;

    return formattedMessage;
  }

  /**
   * Verifica se o nível de log deve ser mostrado
   */
  private shouldLog(level: LogLevel): boolean {
    // Se for debug, só mostra se estiver em ambiente de desenvolvimento ou se a flag NEXT_PUBLIC_DEBUG estiver ativa
    if (level === 'debug') {
      const isDev = process.env.NODE_ENV !== 'production';
      const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === '1';
      if (!isDev && !isDebugEnabled) {
        return false;
      }
    }

    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  /**
   * Log de nível debug (detalhes para desenvolvedor)
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;

    // eslint-disable-next-line no-console
    console.debug(this.formatMessage(message), ...args);
  }

  /**
   * Log de nível info (informações gerais)
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;

    // eslint-disable-next-line no-console
    console.info(this.formatMessage(message), ...args);
  }

  /**
   * Log de nível warn (avisos)
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;

    // eslint-disable-next-line no-console
    console.warn(this.formatMessage(message), ...args);
  }

  /**
   * Log de nível error (erros)
   */
  error(message: string, error?: unknown, ...args: any[]): void {
    if (!this.shouldLog('error')) return;

    // eslint-disable-next-line no-console
    console.error(this.formatMessage(message), error, ...args);

    // Registro detalhado de erros para diagnóstico
    if (error) {
      this.logErrorDetails(error);
    }

    // TODO: Implementar envio para servidor de monitoramento
    if (this.reportToServer) {
      this.reportErrorToServer(message, error);
    }
  }

  /**
   * Registra detalhes adicionais de um erro para facilitar diagnóstico
   */
  private logErrorDetails(error: any): void {
    if (!error) return;

    // Simplificado para evitar console.group e reduzir ruído
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(`[Error Details] ${error.name}: ${error.message}`);
      if (error.stack) {
        // eslint-disable-next-line no-console
        console.debug(`[Error Stack] ${error.stack}`);
      }
    }

    // Log de propriedades adicionais (útil para erros de API)
    if (error.isApiError) {
      // eslint-disable-next-line no-console
      console.error(`[API Error] Code: ${error.statusCode}, Type: ${error.errorType}`);
      if (Array.isArray(error.messages)) {
        // eslint-disable-next-line no-console
        console.error(`[API Messages] ${error.messages.join(', ')}`);
      }
    }

    // Se for erro de API do Axios
    if (error.response) {
      // eslint-disable-next-line no-console
      console.error(`[Axios Error] Status: ${error.response.status}`);
    }
  }

  /**
   * Envia erro para servidor de monitoramento (implementação futura)
   */
  private reportErrorToServer(_message: string, _error: unknown): void {
    // TODO: Implementar envio para servidor de monitoramento
    // Por exemplo: integração com Sentry, LogRocket, etc.
  }

  /**
   * Registra tempo de execução de uma operação (útil para performance)
   */
  time(label: string, operation: () => any): any {
    if (!this.shouldLog('debug')) {
      return operation();
    }

    // eslint-disable-next-line no-console
    console.time(this.formatMessage(label));
    try {
      return operation();
    } finally {
      // eslint-disable-next-line no-console
      console.timeEnd(this.formatMessage(label));
    }
  }

  /**
   * Registra tempo de execução de uma operação assíncrona
   */
  async timeAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
    if (!this.shouldLog('debug')) {
      return operation();
    }

    // eslint-disable-next-line no-console
    console.time(this.formatMessage(label));
    try {
      return await operation();
    } finally {
      // eslint-disable-next-line no-console
      console.timeEnd(this.formatMessage(label));
    }
  }
}

// Logger global para uso geral na aplicação
export const logger = new Logger({
  prefix: 'Linos',
  includeTimestamp: true,
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Loggers específicos para cada módulo
export const createLogger = (module: string, options: Partial<LoggerOptions> = {}) => {
  return new Logger({
    prefix: `Linos:${module}`,
    includeTimestamp: true,
    minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    ...options,
  });
};

// Loggers pré-configurados para módulos comuns
export const loggers = {
  api: createLogger('API'),
  auth: createLogger('Auth'),
  produtos: createLogger('Produtos'),
  clientes: createLogger('Clientes'),
  pedidos: createLogger('Pedidos'),
  usuarios: createLogger('Usuarios'),
  forms: createLogger('Forms'),
};
