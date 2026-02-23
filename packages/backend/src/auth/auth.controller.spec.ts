import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './services/password-reset.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthResponse = {
    access_token: 'mock-jwt-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 900,
    usuario: {
      id: 1,
      nome: 'Admin',
      email: 'admin@linos.com',
      papel: {
        id: 1,
        nome: 'Administrador',
        codigo: 'ADMIN_SISTEMA',
        tipo: 'INTERNO',
        nivel: 100,
        permissoes: { clientes: ['listar', 'ver', 'criar'] },
      },
    },
  };

  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockPasswordResetService = {
    solicitarReset: jest.fn(),
    validarToken: jest.fn(),
    confirmarReset: jest.fn(),
  };

  const mockRequest = (overrides: any = {}) => ({
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'TestAgent/1.0' },
    user: {
      sub: 1,
      email: 'admin@linos.com',
      nome: 'Admin',
      papel: { id: 1, nome: 'Administrador', codigo: 'ADMIN_SISTEMA' },
    },
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PasswordResetService, useValue: mockPasswordResetService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // =========================================================================
  // LOGIN
  // =========================================================================

  describe('login', () => {
    it('deve retornar access_token, refresh_token e usuario', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const req = mockRequest();

      const result = await controller.login(
        { email: 'admin@linos.com', senha: 'admin123' },
        req as any,
      );

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('usuario');
      expect(result.expires_in).toBe(900);
    });

    it('deve passar IP e User-Agent do request ao service', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const req = mockRequest({
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      await controller.login(
        { email: 'admin@linos.com', senha: 'admin123' },
        req as any,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: 'admin@linos.com', senha: 'admin123' },
        '192.168.1.100',
        'Mozilla/5.0',
      );
    });

    it('deve usar socket.remoteAddress quando req.ip é undefined', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const req = mockRequest({
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' },
      });

      await controller.login(
        { email: 'admin@linos.com', senha: 'admin123' },
        req as any,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: 'admin@linos.com', senha: 'admin123' },
        '10.0.0.1',
        expect.any(String),
      );
    });
  });

  // =========================================================================
  // REFRESH
  // =========================================================================

  describe('refresh', () => {
    it('deve retornar novo access_token e refresh_token', async () => {
      mockAuthService.refresh.mockResolvedValue({
        ...mockAuthResponse,
        refresh_token: 'new-refresh-token',
      });
      const req = mockRequest();

      const result = await controller.refresh(
        { refresh_token: 'old-refresh-token' },
        req as any,
      );

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.refresh_token).toBe('new-refresh-token');
    });

    it('deve passar IP e User-Agent ao service.refresh', async () => {
      mockAuthService.refresh.mockResolvedValue(mockAuthResponse);
      const req = mockRequest();

      await controller.refresh(
        { refresh_token: 'token-value' },
        req as any,
      );

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'token-value',
        '127.0.0.1',
        'TestAgent/1.0',
      );
    });
  });

  // =========================================================================
  // LOGOUT
  // =========================================================================

  describe('logout', () => {
    it('deve chamar service.logout com o refresh_token', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Logout realizado com sucesso',
      });

      const result = await controller.logout({ refresh_token: 'token-to-revoke' });

      expect(mockAuthService.logout).toHaveBeenCalledWith('token-to-revoke');
      expect(result).toEqual({ message: 'Logout realizado com sucesso' });
    });
  });

  // =========================================================================
  // ME
  // =========================================================================

  describe('me', () => {
    it('deve retornar dados do usuário do request (via JwtAuthGuard)', async () => {
      const req = mockRequest();

      const result = await controller.me(req as any);

      expect(result).toEqual(req.user);
      expect(result.email).toBe('admin@linos.com');
      expect(result.nome).toBe('Admin');
    });

    it('deve retornar dados sem campo senha', async () => {
      const req = mockRequest();

      const result = await controller.me(req as any);

      expect(result).not.toHaveProperty('senha');
    });
  });

  // =========================================================================
  // PASSWORD RESET FLOW
  // =========================================================================

  describe('solicitarReset', () => {
    it('deve chamar passwordResetService.solicitarReset com email', async () => {
      const response = {
        sucesso: true,
        mensagem: 'Se o e-mail estiver cadastrado, você receberá instruções.',
      };
      mockPasswordResetService.solicitarReset.mockResolvedValue(response);

      const result = await controller.solicitarReset({
        email: 'usuario@empresa.com',
      });

      expect(mockPasswordResetService.solicitarReset).toHaveBeenCalledWith(
        'usuario@empresa.com',
      );
      expect(result.sucesso).toBe(true);
    });

    it('deve retornar mensagem genérica (não vaza se email existe)', async () => {
      const response = {
        sucesso: true,
        mensagem: 'Se o e-mail estiver cadastrado, você receberá instruções.',
      };
      mockPasswordResetService.solicitarReset.mockResolvedValue(response);

      const result = await controller.solicitarReset({
        email: 'inexistente@empresa.com',
      });

      // Deve retornar sucesso mesmo para email inexistente
      expect(result.sucesso).toBe(true);
    });
  });

  describe('validarToken', () => {
    it('deve chamar passwordResetService.validarToken com token', async () => {
      mockPasswordResetService.validarToken.mockResolvedValue({ valido: true });

      const result = await controller.validarToken('abc123token');

      expect(mockPasswordResetService.validarToken).toHaveBeenCalledWith(
        'abc123token',
      );
      expect(result.valido).toBe(true);
    });

    it('deve retornar valido:false para token inválido', async () => {
      mockPasswordResetService.validarToken.mockResolvedValue({ valido: false });

      const result = await controller.validarToken('token-expirado');

      expect(result.valido).toBe(false);
    });
  });

  describe('confirmarReset', () => {
    it('deve chamar passwordResetService.confirmarReset com token e nova senha', async () => {
      mockPasswordResetService.confirmarReset.mockResolvedValue({
        sucesso: true,
        mensagem: 'Senha redefinida com sucesso.',
      });

      const result = await controller.confirmarReset({
        token: 'valid-token',
        novaSenha: 'NovaSenha@123',
      });

      expect(mockPasswordResetService.confirmarReset).toHaveBeenCalledWith(
        'valid-token',
        'NovaSenha@123',
      );
      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toBe('Senha redefinida com sucesso.');
    });
  });

  // NOTA: Testes de rate limiting (Throttle) já cobertos em
  // auth.controller.throttle.spec.ts — não duplicados aqui.
});
