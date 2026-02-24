import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { PedidoStatusChangedEvent } from '../pedidos/pedidos.service';

// Mock do Resend SDK
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  const mockEvent = {
    userId: 1,
    email: 'usuario@teste.com',
    token: 'token-abc-123',
    expiresAt: new Date('2026-03-01T12:15:00Z'),
  };

  const mockStatusEvent: PedidoStatusChangedEvent = {
    pedidoId: 42,
    clienteEmail: 'cliente@padaria.com',
    clienteNome: 'Padaria Bom Pão LTDA',
    numeroPedido: 42,
    statusAnterior: 'PENDENTE',
    statusNovo: 'CONFIRMADO',
    tipoUsuario: 'INTERNO',
  };

  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  function createService(envOverrides: Record<string, string> = {}): Promise<EmailService> {
    const envDefaults: Record<string, string> = {
      EMAIL_MOCK: 'false',
      EMAIL_FROM: 'Test <test@resend.dev>',
      FRONTEND_URL: 'https://app.linos.com',
      RESEND_API_KEY: 're_test_key_123',
      ...envOverrides,
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        return envDefaults[key] ?? defaultValue;
      }),
    };

    return Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .compile()
      .then((module: TestingModule) => module.get<EmailService>(EmailService));
  }

  // ===========================================================================
  // MOCK MODE
  // ===========================================================================
  describe('modo mock (EMAIL_MOCK=true)', () => {
    it('deve logar os dados do email no console sem chamar Resend', async () => {
      const service = await createService({ EMAIL_MOCK: 'true' });

      await service.handlePasswordResetRequested(mockEvent);

      expect(logSpy).toHaveBeenCalledWith('=== EMAIL MOCK ===');
      expect(logSpy).toHaveBeenCalledWith(`Para: ${mockEvent.email}`);
      expect(logSpy).toHaveBeenCalledWith('=== FIM EMAIL MOCK ===');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('deve incluir email, link de reset e expiração no log', async () => {
      const service = await createService({ EMAIL_MOCK: 'true' });

      await service.handlePasswordResetRequested(mockEvent);

      expect(logSpy).toHaveBeenCalledWith(
        `Link de reset: https://app.linos.com/reset-senha?token=${mockEvent.token}`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Expira em: ${mockEvent.expiresAt.toISOString()}`,
      );
    });

    it('não deve instanciar Resend client', async () => {
      const { Resend } = require('resend');
      (Resend as jest.Mock).mockClear();

      await createService({ EMAIL_MOCK: 'true' });

      expect(Resend).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ENVIO REAL
  // ===========================================================================
  describe('envio real (EMAIL_MOCK=false)', () => {
    it('deve chamar resend.emails.send() com os parâmetros corretos', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
      const service = await createService();

      await service.handlePasswordResetRequested(mockEvent);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('Test <test@resend.dev>');
      expect(callArgs.to).toBe(mockEvent.email);
      expect(callArgs.subject).toContain('Redefinição de senha');
      expect(callArgs.html).toBeDefined();
    });

    it('o HTML deve conter o link de reset com o token', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
      const service = await createService();

      await service.handlePasswordResetRequested(mockEvent);

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain(`https://app.linos.com/reset-senha?token=${mockEvent.token}`);
    });

    it('o HTML deve conter texto de expiração de 15 minutos', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
      const service = await createService();

      await service.handlePasswordResetRequested(mockEvent);

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('15 minutos');
    });

    it('deve logar sucesso após envio', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_456' }, error: null });
      const service = await createService();

      await service.handlePasswordResetRequested(mockEvent);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Email de reset enviado para ${mockEvent.email}`),
      );
    });
  });

  // ===========================================================================
  // TRATAMENTO DE ERROS
  // ===========================================================================
  describe('tratamento de erros', () => {
    it('se Resend retornar erro, deve logar sem propagar exceção', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'API key inválida', name: 'validation_error' },
      });
      const service = await createService();

      await expect(
        service.handlePasswordResetRequested(mockEvent),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falha ao enviar email de reset'),
      );
    });

    it('se Resend lançar exceção, deve logar sem propagar', async () => {
      mockSend.mockRejectedValue(new Error('Network timeout'));
      const service = await createService();

      await expect(
        service.handlePasswordResetRequested(mockEvent),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network timeout'),
      );
    });

    it('se Resend não estiver configurado, deve logar erro sem propagar', async () => {
      const service = await createService({
        EMAIL_MOCK: 'false',
        RESEND_API_KEY: undefined as any,
      });

      await expect(
        service.handlePasswordResetRequested(mockEvent),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resend não configurado'),
      );
    });
  });

  // ===========================================================================
  // CONFIGURAÇÃO
  // ===========================================================================
  describe('configuração', () => {
    it('deve usar EMAIL_FROM do ConfigService', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_789' }, error: null });
      const service = await createService({
        EMAIL_FROM: 'Padaria <padaria@exemplo.com>',
      });

      await service.handlePasswordResetRequested(mockEvent);

      expect(mockSend.mock.calls[0][0].from).toBe('Padaria <padaria@exemplo.com>');
    });

    it('deve usar default de EMAIL_FROM quando não configurado', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_000' }, error: null });
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          const vals: Record<string, string | undefined> = {
            EMAIL_MOCK: 'false',
            RESEND_API_KEY: 're_test_key',
            FRONTEND_URL: 'http://localhost:3000',
          };
          return vals[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);
      await service.handlePasswordResetRequested(mockEvent);

      expect(mockSend.mock.calls[0][0].from).toBe(
        "Lino's Panificadora <noreply@resend.dev>",
      );
    });

    it('deve usar FRONTEND_URL para montar o link de reset', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_111' }, error: null });
      const service = await createService({
        FRONTEND_URL: 'https://custom.domain.com',
      });

      await service.handlePasswordResetRequested(mockEvent);

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain(
        `https://custom.domain.com/reset-senha?token=${mockEvent.token}`,
      );
    });
  });

  // ===========================================================================
  // NOTIFICAÇÃO DE MUDANÇA DE STATUS DO PEDIDO
  // ===========================================================================
  describe('handlePedidoStatusChanged', () => {
    it('deve enviar email quando tipoUsuario é INTERNO', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_status_1' }, error: null });
      const service = await createService();

      await service.handlePedidoStatusChanged(mockStatusEvent);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('cliente@padaria.com');
      expect(callArgs.subject).toContain('Pedido #42');
      expect(callArgs.subject).toContain('Confirmado');
    });

    it('NÃO deve enviar email quando tipoUsuario é CLIENTE', async () => {
      const service = await createService();

      await service.handlePedidoStatusChanged({
        ...mockStatusEvent,
        tipoUsuario: 'CLIENTE',
      });

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('o HTML deve conter nome do cliente e número do pedido', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_status_2' }, error: null });
      const service = await createService();

      await service.handlePedidoStatusChanged(mockStatusEvent);

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('Padaria Bom Pão LTDA');
      expect(html).toContain('#42');
    });

    it('o HTML deve conter status anterior e novo', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_status_3' }, error: null });
      const service = await createService();

      await service.handlePedidoStatusChanged(mockStatusEvent);

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('Pendente');
      expect(html).toContain('Confirmado');
    });

    it.each([
      ['CONFIRMADO', 'Seu pedido foi confirmado! Estamos preparando tudo.'],
      ['EM_PRODUCAO', 'Seu pedido está em produção.'],
      ['PRONTO', 'Seu pedido está pronto para retirada/entrega!'],
      ['ENTREGUE', 'Seu pedido foi entregue. Obrigado pela preferência!'],
      ['CANCELADO', 'Seu pedido foi cancelado.'],
    ])('deve gerar mensagem amigável para status %s', async (status, mensagem) => {
      mockSend.mockResolvedValue({ data: { id: 'msg_each' }, error: null });
      const service = await createService();

      await service.handlePedidoStatusChanged({
        ...mockStatusEvent,
        statusNovo: status,
      });

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain(mensagem);
    });

    it('o HTML deve conter footer com aviso de email automático', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_footer' }, error: null });
      const service = await createService();

      await service.handlePedidoStatusChanged(mockStatusEvent);

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('Este é um email automático, não responda.');
    });

    it('falha no envio não deve lançar exceção (fire-and-forget)', async () => {
      mockSend.mockRejectedValue(new Error('SMTP down'));
      const service = await createService();

      await expect(
        service.handlePedidoStatusChanged(mockStatusEvent),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMTP down'),
      );
    });

    it('deve logar em modo mock sem chamar Resend', async () => {
      const service = await createService({ EMAIL_MOCK: 'true' });

      await service.handlePedidoStatusChanged(mockStatusEvent);

      expect(mockSend).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('=== EMAIL MOCK ===');
    });
  });
});
