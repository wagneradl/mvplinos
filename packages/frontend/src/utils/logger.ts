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
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }
  
  /**
   * Log de nível debug (detalhes para desenvolvedor)
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    
    console.debug(this.formatMessage(message), ...args);
  }
  
  /**
   * Log de nível info (informações gerais)
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    
    console.info(this.formatMessage(message), ...args);
  }
  
  /**
   * Log de nível warn (avisos)
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    
    console.warn(this.formatMessage(message), ...args);
  }
  
  /**
   * Log de nível error (erros)
   */
  error(message: string, error?: any, ...args: any[]): void {
    if (!this.shouldLog('error')) return;
    
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
    
    console.group('Detalhes do Erro:');
    
    if (error instanceof Error) {
      console.error('Mensagem:', error.message);
      console.error('Nome:', error.name);
      console.error('Stack:', error.stack);
    }
    
    // Log de propriedades adicionais (útil para erros de API)
    if (error.isApiError) {
      console.error('Código:', error.statusCode);
      console.error('Tipo:', error.errorType);
      
      if (Array.isArray(error.messages)) {
        console.error('Mensagens:', error.messages);
      }
    }
    
    // Se for erro de API do Axios
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Requisição sem resposta:', error.request);
    }
    
    console.groupEnd();
  }
  
  /**
   * Envia erro para servidor de monitoramento (implementação futura)
   */
  private reportErrorToServer(message: string, error: any): void {
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
    
    console.time(this.formatMessage(label));
    try {
      return operation();
    } finally {
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
    
    console.time(this.formatMessage(label));
    try {
      return await operation();
    } finally {
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
  forms: createLogger('Forms'),
};
