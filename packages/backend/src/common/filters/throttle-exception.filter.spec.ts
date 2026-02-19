import { ThrottleExceptionFilter } from './throttle-exception.filter';
import { ThrottlerException } from '@nestjs/throttler';
import { ArgumentsHost } from '@nestjs/common';

describe('ThrottleExceptionFilter', () => {
  let filter: ThrottleExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new ThrottleExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({}),
        getNext: () => jest.fn(),
      }),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http' as const,
    } as unknown as ArgumentsHost;
  });

  it('deve retornar status 429', () => {
    const exception = new ThrottlerException();

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(429);
  });

  it('deve retornar mensagem em português', () => {
    const exception = new ThrottlerException();

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 429,
      message: 'Muitas tentativas. Tente novamente em breve.',
    });
  });

  it('deve retornar exatamente dois campos no JSON', () => {
    const exception = new ThrottlerException();

    filter.catch(exception, mockHost);

    const responseBody = mockJson.mock.calls[0][0];
    expect(Object.keys(responseBody)).toHaveLength(2);
    expect(responseBody).toHaveProperty('statusCode');
    expect(responseBody).toHaveProperty('message');
  });
});
