import { StructuredLoggerService } from './structured-logger.service';

describe('StructuredLoggerService', () => {
  let logger: StructuredLoggerService;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new StructuredLoggerService();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('em production, output deve ser JSON válido com campos esperados', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Criar nova instância para capturar isProduction=true
    const prodLogger = new StructuredLoggerService();
    prodLogger.log('test message', 'TestContext');

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('level', 'log');
    expect(parsed).toHaveProperty('message', 'test message');
    expect(parsed).toHaveProperty('context', 'TestContext');

    process.env.NODE_ENV = originalEnv;
  });

  it('em development, NÃO deve usar stdout.write (usa formato padrão)', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const devLogger = new StructuredLoggerService();
    // Chamar via super delega ao ConsoleLogger que não usa stdout.write diretamente
    // com nosso printJson, então verificamos que NÃO chamou nosso printJson
    devLogger.log('test message', 'TestContext');

    // Em dev, não deve ter chamado stdout.write com JSON
    const jsonCalls = stdoutSpy.mock.calls.filter((call) => {
      try {
        JSON.parse(call[0]);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonCalls.length).toBe(0);

    process.env.NODE_ENV = originalEnv;
  });

  it('logWithContext deve incluir extra data em production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const prodLogger = new StructuredLoggerService();
    prodLogger.logWithContext('log', 'Pedido criado', 'PedidosService', {
      pedidoId: 42,
      clienteId: 7,
    });

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('pedidoId', 42);
    expect(parsed).toHaveProperty('clienteId', 7);
    expect(parsed).toHaveProperty('message', 'Pedido criado');
    expect(parsed).toHaveProperty('context', 'PedidosService');

    process.env.NODE_ENV = originalEnv;
  });
});
