import { SentryExceptionFilter } from './sentry-exception.filter';
import {
  HttpException,
  HttpStatus,
  ArgumentsHost,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

jest.mock('@sentry/nestjs', () => ({
  withScope: jest.fn((cb) => cb({ setExtra: jest.fn(), setUser: jest.fn() })),
  captureException: jest.fn(),
}));

describe('SentryExceptionFilter', () => {
  let filter: SentryExceptionFilter;
  let mockHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new SentryExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      url: '/test',
      method: 'GET',
      user: { id: 1 },
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
    jest.clearAllMocks();
  });

  it('deve capturar exceção genérica (Error) no Sentry', () => {
    const error = new Error('Internal error');

    filter.catch(error, mockHost);

    expect(Sentry.withScope).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('deve capturar HttpException 500 no Sentry', () => {
    const error = new HttpException('Server Error', HttpStatus.INTERNAL_SERVER_ERROR);

    filter.catch(error, mockHost);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('NÃO deve capturar HttpException 400 no Sentry', () => {
    const error = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

    filter.catch(error, mockHost);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('NÃO deve capturar HttpException 401 no Sentry', () => {
    const error = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    filter.catch(error, mockHost);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('NÃO deve capturar HttpException 404 no Sentry', () => {
    const error = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(error, mockHost);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('deve adicionar contexto do request (url, method, user) ao scope', () => {
    const error = new Error('Internal error');
    const mockScope = { setExtra: jest.fn(), setUser: jest.fn() };
    (Sentry.withScope as jest.Mock).mockImplementation((cb) => cb(mockScope));

    filter.catch(error, mockHost);

    expect(mockScope.setExtra).toHaveBeenCalledWith('url', '/test');
    expect(mockScope.setExtra).toHaveBeenCalledWith('method', 'GET');
    expect(mockScope.setUser).toHaveBeenCalledWith({ id: '1' });
  });
});
