import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;

  const mockPapel = {
    id: 1,
    nome: 'Administrador',
    codigo: 'ADMIN_SISTEMA',
    tipo: 'INTERNO',
    nivel: 100,
    permissoes: JSON.stringify({ clientes: ['listar', 'ver', 'criar'] }),
  };

  const mockUsuario = {
    id: 1,
    nome: 'Admin',
    email: 'admin@linos.com',
    senha: '$2a$10$hashsenha',
    status: 'ativo',
    papel_id: 1,
    papel: mockPapel,
  };

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'REFRESH_TOKEN_EXPIRATION_HOURS') return 24;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // =========================================================================
  // LOGIN
  // =========================================================================

  describe('login', () => {
    it('deve gerar access_token e refresh_token ao fazer login', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@linos.com', senha: 'admin123' },
        '127.0.0.1',
        'TestAgent',
      );

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('expires_in', 900);
      expect(result).toHaveProperty('usuario');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.refresh_token).toHaveLength(96); // 48 bytes hex
      expect(result.usuario.id).toBe(1);
      expect(result.usuario.papel.codigo).toBe('ADMIN_SISTEMA');
    });

    it('deve revogar todos os refresh tokens anteriores ao fazer login', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login({ email: 'admin@linos.com', senha: 'admin123' });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_id: 1,
          revoked_at: null,
        },
        data: {
          revoked_at: expect.any(Date),
        },
      });
    });

    it('deve salvar ip_address e user_agent no refresh token', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login(
        { email: 'admin@linos.com', senha: 'admin123' },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuario_id: 1,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        }),
      });
    });

    it('deve rejeitar credenciais inválidas', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@linos.com', senha: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve rejeitar usuário inativo', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        status: 'inativo',
      });

      await expect(
        service.login({ email: 'admin@linos.com', senha: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // REFRESH
  // =========================================================================

  describe('refresh', () => {
    const mockStoredToken = {
      id: 10,
      usuario_id: 1,
      token: 'a'.repeat(96),
      ip_address: '127.0.0.1',
      user_agent: 'TestAgent',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h no futuro
      revoked_at: null,
      created_at: new Date(),
      usuario: mockUsuario,
    };

    it('deve renovar tokens com refresh token válido', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('a'.repeat(96), '127.0.0.1', 'TestAgent');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('expires_in', 900);
      expect(result.refresh_token).toHaveLength(96);
      // O novo refresh token deve ser diferente do antigo
      expect(result.refresh_token).not.toBe('a'.repeat(96));
    });

    it('deve revogar o token usado ao fazer refresh (rotation)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.refresh('a'.repeat(96));

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { revoked_at: expect.any(Date) },
      });
    });

    it('deve retornar 401 para refresh token expirado', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expires_at: new Date(Date.now() - 1000), // Expirado
      });

      await expect(service.refresh('a'.repeat(96))).rejects.toThrow(
        new UnauthorizedException('Token expirado'),
      );
    });

    it('deve retornar 401 para refresh token já revogado', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        revoked_at: new Date(),
      });

      await expect(service.refresh('a'.repeat(96))).rejects.toThrow(
        new UnauthorizedException('Token já foi revogado'),
      );
    });

    it('deve retornar 401 para refresh token inexistente', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('token-inexistente')).rejects.toThrow(
        new UnauthorizedException('Token inválido'),
      );
    });

    it('deve logar warning quando IP muda no refresh', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.refresh('a'.repeat(96), '10.0.0.1', 'TestAgent');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP diferente'),
      );
    });
  });

  // =========================================================================
  // LOGOUT
  // =========================================================================

  describe('logout', () => {
    it('deve revogar o refresh token ao fazer logout', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 10,
        token: 'token-ativo',
        revoked_at: null,
      });
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      const result = await service.logout('token-ativo');

      expect(result).toEqual({ message: 'Logout realizado com sucesso' });
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { revoked_at: expect.any(Date) },
      });
    });

    it('deve retornar sucesso para token inexistente (idempotente)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.logout('token-inexistente');

      expect(result).toEqual({ message: 'Logout realizado com sucesso' });
      expect(mockPrismaService.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CLEANUP
  // =========================================================================

  describe('limparTokensExpirados', () => {
    it('deve remover apenas tokens expirados E revogados', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.limparTokensExpirados();

      expect(result).toBe(5);
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expires_at: { lt: expect.any(Date) },
          revoked_at: { not: null },
        },
      });
    });
  });
});
