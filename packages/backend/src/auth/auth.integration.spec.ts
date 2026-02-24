import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
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

/**
 * Testes de integração (com mocks) — Fluxo completo de Registro → Aprovação/Rejeição → Login
 * Valida o fluxo end-to-end do M3: auto-cadastro de cliente.
 */
describe('Auth Integration — Fluxo de Registro', () => {
  let service: AuthService;

  const mockPapelCliente = {
    id: 6,
    nome: 'Cliente Admin',
    codigo: 'CLIENTE_ADMIN',
    tipo: 'CLIENTE',
    nivel: 30,
    permissoes: JSON.stringify({ pedidos: ['listar', 'ver', 'criar'] }),
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

  const registroDto = {
    razao_social: 'Padaria Integração Ltda',
    nome_fantasia: 'Padaria Integração',
    cnpj: '99.888.777/0001-66',
    email_empresa: 'contato@padariaintegracao.com',
    telefone: '(11) 91234-5678',
    nome_responsavel: 'Carlos Teste',
    email_responsavel: 'carlos@padariaintegracao.com',
    senha: 'Senha@Forte123',
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
  // FLUXO: Registro → Aprovação → Login
  // =========================================================================

  describe('Registro → Aprovação → Login', () => {
    it('deve criar cliente pendente e usuario inativo ao registrar', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.papel.findFirst.mockResolvedValue(mockPapelCliente);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashed');
      mockPrismaService.cliente.create.mockResolvedValue({ id: 200 });
      mockPrismaService.usuario.create.mockResolvedValue({ id: 300 });

      const result = await service.registrarCliente(registroDto);

      expect(result.clienteId).toBe(200);
      expect(result.message).toContain('Cadastro recebido');

      // Verificar que cliente foi criado como pendente_aprovacao
      expect(mockPrismaService.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'pendente_aprovacao',
        }),
      });

      // Verificar que usuario foi criado como inativo
      expect(mockPrismaService.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'inativo',
          cliente_id: 200,
          papel_id: mockPapelCliente.id,
        }),
      });
    });

    it('deve bloquear login enquanto cliente está pendente de aprovação', async () => {
      // Simula usuario criado pelo registro (inativo, com cliente pendente)
      const usuarioPendente = {
        id: 300,
        nome: 'Carlos Teste',
        email: 'carlos@padariaintegracao.com',
        senha: '$2a$10$hashed',
        status: 'inativo', // usuario inativo enquanto pendente
        papel_id: 6,
        cliente_id: 200,
        papel: mockPapelCliente,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioPendente);

      // Login deve falhar porque usuario está inativo
      await expect(
        service.login({ email: 'carlos@padariaintegracao.com', senha: 'Senha@Forte123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve permitir login após aprovação (cliente ativo + usuario ativo)', async () => {
      // Simula estado PÓS-APROVAÇÃO: usuario ativo, cliente ativo
      const usuarioAprovado = {
        id: 300,
        nome: 'Carlos Teste',
        email: 'carlos@padariaintegracao.com',
        senha: '$2a$10$hashed',
        status: 'ativo',
        papel_id: 6,
        cliente_id: 200,
        papel: mockPapelCliente,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioAprovado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({ id: 200, status: 'ativo' });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'carlos@padariaintegracao.com', senha: 'Senha@Forte123' },
      );

      expect(result).toHaveProperty('access_token');
      expect(result.usuario.clienteId).toBe(200);

      // JWT deve conter clienteId e papel com tipo CLIENTE
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId: 200,
          papel: expect.objectContaining({ tipo: 'CLIENTE' }),
        }),
      );
    });
  });

  // =========================================================================
  // FLUXO: Registro → Rejeição → Login Bloqueado
  // =========================================================================

  describe('Registro → Rejeição → Login Bloqueado', () => {
    it('deve bloquear login após cliente ser rejeitado', async () => {
      // Simula usuario com cliente rejeitado
      // Após rejeição, usuario permanece inativo mas o teste de login
      // verifica o status do cliente
      const usuarioClienteRejeitado = {
        id: 300,
        nome: 'Carlos Teste',
        email: 'carlos@padariaintegracao.com',
        senha: '$2a$10$hashed',
        status: 'ativo', // mesmo que usuario estivesse ativo
        papel_id: 6,
        cliente_id: 200,
        papel: mockPapelCliente,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioClienteRejeitado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 200,
        status: 'rejeitado',
      });

      await expect(
        service.login({ email: 'carlos@padariaintegracao.com', senha: 'Senha@Forte123' }),
      ).rejects.toThrow(new UnauthorizedException('Cadastro da empresa foi rejeitado'));
    });
  });

  // =========================================================================
  // REFRESH — Bloqueio por status do cliente
  // =========================================================================

  describe('Refresh token — bloqueio por status do cliente', () => {
    const mockStoredToken = {
      id: 50,
      usuario_id: 300,
      token: 'b'.repeat(96),
      ip_address: '127.0.0.1',
      user_agent: 'TestAgent',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      revoked_at: null,
      created_at: new Date(),
      usuario: {
        id: 300,
        nome: 'Carlos Teste',
        email: 'carlos@padariaintegracao.com',
        senha: '$2a$10$hashed',
        status: 'ativo',
        papel_id: 6,
        cliente_id: 200,
        papel: mockPapelCliente,
      },
    };

    it('deve bloquear refresh quando cliente está rejeitado', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 200,
        status: 'rejeitado',
      });

      await expect(service.refresh('b'.repeat(96))).rejects.toThrow(
        new UnauthorizedException('Empresa não está ativa'),
      );
    });

    it('deve bloquear refresh quando cliente está suspenso', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.cliente.findUnique.mockResolvedValue({
        id: 200,
        status: 'suspenso',
      });

      await expect(service.refresh('b'.repeat(96))).rejects.toThrow(
        new UnauthorizedException('Empresa não está ativa'),
      );
    });
  });
});
