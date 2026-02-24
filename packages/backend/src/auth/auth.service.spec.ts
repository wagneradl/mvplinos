import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';
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
    cliente_id: null,
    papel: mockPapel,
  };

  const mockPapelCliente = {
    id: 6,
    nome: 'Cliente Admin',
    codigo: 'CLIENTE_ADMIN',
    tipo: 'CLIENTE',
    nivel: 30,
    permissoes: JSON.stringify({ pedidos: ['listar', 'ver', 'criar'] }),
  };

  const mockUsuarioCliente = {
    id: 10,
    nome: 'Admin Padaria',
    email: 'admin@padaria.com',
    senha: '$2a$10$hashsenha',
    status: 'ativo',
    papel_id: 6,
    cliente_id: 5,
    papel: mockPapelCliente,
  };

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    papel: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((cb: (prisma: any) => Promise<any>) =>
      cb(mockPrismaService),
    ),
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

  const mockEmailService = {
    enviarEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        StructuredLoggerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
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

    it('deve rejeitar email não encontrado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inexistente@linos.com', senha: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve rejeitar usuário soft-deleted (findUnique retorna null)', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        status: 'inativo',
        deleted_at: new Date(),
      });

      await expect(
        service.login({ email: 'admin@linos.com', senha: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve retornar dados do usuário sem o campo senha', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@linos.com', senha: 'admin123' },
      );

      expect(result.usuario).toBeDefined();
      expect(result.usuario).not.toHaveProperty('senha');
      expect(result.usuario.id).toBe(1);
      expect(result.usuario.nome).toBe('Admin');
      expect(result.usuario.email).toBe('admin@linos.com');
    });

    it('deve incluir permissões parseadas no response', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@linos.com', senha: 'admin123' },
      );

      expect(result.usuario.papel.permissoes).toEqual({
        clientes: ['listar', 'ver', 'criar'],
      });
    });

    it('deve incluir clienteId=null no JWT para usuário INTERNO', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@linos.com', senha: 'admin123' },
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: null }),
      );
      expect(result.usuario.clienteId).toBeNull();
    });

    it('deve incluir clienteId no JWT para usuário CLIENTE', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({ id: 5, status: 'ativo' });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@padaria.com', senha: 'senha123' },
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: 5 }),
      );
      expect(result.usuario.clienteId).toBe(5);
    });

    // --- Bloqueio de login por status do cliente ---

    it('deve bloquear login para cliente pendente_aprovacao', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 5,
        status: 'pendente_aprovacao',
      });

      await expect(
        service.login({ email: 'admin@padaria.com', senha: 'senha123' }),
      ).rejects.toThrow(new UnauthorizedException('Empresa aguardando aprovação'));
    });

    it('deve bloquear login para cliente rejeitado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 5,
        status: 'rejeitado',
      });

      await expect(
        service.login({ email: 'admin@padaria.com', senha: 'senha123' }),
      ).rejects.toThrow(new UnauthorizedException('Cadastro da empresa foi rejeitado'));
    });

    it('deve bloquear login para cliente suspenso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 5,
        status: 'suspenso',
      });

      await expect(
        service.login({ email: 'admin@padaria.com', senha: 'senha123' }),
      ).rejects.toThrow(
        new UnauthorizedException('Empresa suspensa. Entre em contato com o suporte'),
      );
    });

    it('deve permitir login para cliente ativo + usuario ativo', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({ id: 5, status: 'ativo' });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@padaria.com', senha: 'senha123' },
      );

      expect(result).toHaveProperty('access_token');
      expect(result.usuario.clienteId).toBe(5);
    });
  });

  // =========================================================================
  // REGISTRAR CLIENTE
  // =========================================================================

  describe('registrarCliente', () => {
    const registroDto = {
      razao_social: 'Nova Padaria Ltda',
      nome_fantasia: 'Nova Padaria',
      cnpj: '12.345.678/0001-90',
      email_empresa: 'contato@novapadaria.com',
      telefone: '(11) 99999-9999',
      nome_responsavel: 'João Silva',
      email_responsavel: 'joao@novapadaria.com',
      senha: 'Senha@123',
    };

    it('deve criar Cliente pendente + Usuario inativo em transação', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.papel.findFirst.mockResolvedValue(mockPapelCliente);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashed');
      mockPrismaService.cliente.create.mockResolvedValue({ id: 99 });
      mockPrismaService.usuario.create.mockResolvedValue({ id: 50 });

      const result = await service.registrarCliente(registroDto);

      expect(result.message).toContain('Cadastro recebido');
      expect(result.clienteId).toBe(99);
      expect(mockPrismaService.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'pendente_aprovacao',
          cnpj: registroDto.cnpj,
        }),
      });
      expect(mockPrismaService.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'inativo',
          email: registroDto.email_responsavel,
          cliente_id: 99,
        }),
      });
    });

    it('deve rejeitar CNPJ duplicado', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 1, cnpj: registroDto.cnpj });

      await expect(service.registrarCliente(registroDto)).rejects.toThrow(
        new ConflictException('CNPJ já cadastrado no sistema'),
      );
    });

    it('deve rejeitar email duplicado', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue({ id: 1, email: registroDto.email_responsavel });

      await expect(service.registrarCliente(registroDto)).rejects.toThrow(
        new ConflictException('Email já cadastrado no sistema'),
      );
    });

    it('deve falhar se papel CLIENTE_ADMIN não existe', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.papel.findFirst.mockResolvedValue(null);

      await expect(service.registrarCliente(registroDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('deve enviar email de confirmação', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.papel.findFirst.mockResolvedValue(mockPapelCliente);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashed');
      mockPrismaService.cliente.create.mockResolvedValue({ id: 99 });
      mockPrismaService.usuario.create.mockResolvedValue({ id: 50 });

      await service.registrarCliente(registroDto);

      // Aguardar microtask do .catch()
      await new Promise((r) => setImmediate(r));

      expect(mockEmailService.enviarEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: registroDto.email_responsavel,
          subject: expect.stringContaining('Cadastro recebido'),
        }),
      );
    });

    it('deve usar razao_social como fallback para nome_fantasia', async () => {
      const dtoSemFantasia = { ...registroDto, nome_fantasia: undefined };
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.papel.findFirst.mockResolvedValue(mockPapelCliente);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashed');
      mockPrismaService.cliente.create.mockResolvedValue({ id: 99 });
      mockPrismaService.usuario.create.mockResolvedValue({ id: 50 });

      await service.registrarCliente(dtoSemFantasia);

      expect(mockPrismaService.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nome_fantasia: 'Nova Padaria Ltda',
        }),
      });
    });
  });

  // =========================================================================
  // ME / getProfile
  // NOTA: O endpoint /me é tratado diretamente no controller (retorna req.user
  // do JWT guard). Não existe método getProfile/getMe no AuthService, portanto
  // testes de ME pertencem ao controller spec, não ao service spec.
  // =========================================================================

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
        expires_at: new Date(Date.now() - 1000),
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

    it('deve incluir clienteId no JWT ao renovar token de CLIENTE', async () => {
      const mockStoredTokenCliente = {
        ...mockStoredToken,
        usuario_id: 10,
        usuario: mockUsuarioCliente,
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredTokenCliente);
      mockPrismaService.cliente.findUnique.mockResolvedValue({ id: 5, status: 'ativo' });
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('a'.repeat(96));

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: 5 }),
      );
      expect(result.usuario.clienteId).toBe(5);
    });

    it('deve bloquear refresh se cliente não está ativo', async () => {
      const mockStoredTokenCliente = {
        ...mockStoredToken,
        usuario_id: 10,
        usuario: mockUsuarioCliente,
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredTokenCliente);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 5,
        status: 'pendente_aprovacao',
      });

      await expect(service.refresh('a'.repeat(96))).rejects.toThrow(
        new UnauthorizedException('Empresa não está ativa'),
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

  // =========================================================================
  // VALIDATE TOKEN
  // =========================================================================

  describe('validateToken', () => {
    it('deve retornar payload para token JWT válido', async () => {
      const mockPayload = { sub: 1, email: 'admin@linos.com' };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = await service.validateToken('valid-jwt-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('deve rejeitar token JWT inválido', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
