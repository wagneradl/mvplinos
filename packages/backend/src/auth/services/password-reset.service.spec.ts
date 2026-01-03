import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const mockUsuario = {
    id: 1,
    email: 'usuario@teste.com',
    status: 'ativo',
    nome: 'Usuário Teste',
    senha: 'hashSenhaAntiga',
  };

  const mockToken = {
    id: 1,
    usuario_id: 1,
    token: 'valid-token-123',
    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos no futuro
    used_at: null,
    created_at: new Date(),
    usuario: mockUsuario,
  };

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // TESTES: solicitarReset
  // =========================================================================
  describe('solicitarReset', () => {
    it('deve retornar sucesso mesmo quando e-mail não existe (segurança)', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      const result = await service.solicitarReset('inexistente@teste.com');

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toContain('Se o e-mail estiver cadastrado');
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('deve retornar sucesso e criar token quando usuário existe e está ativo', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue(mockToken);

      const result = await service.solicitarReset('usuario@teste.com');

      expect(result.sucesso).toBe(true);
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'password.reset.requested',
        expect.objectContaining({
          userId: mockUsuario.id,
          email: mockUsuario.email,
        }),
      );
    });

    it('deve invalidar tokens anteriores ao criar novo', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue(mockToken);

      await service.solicitarReset('usuario@teste.com');

      expect(mockPrismaService.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_id: mockUsuario.id,
          used_at: null,
        },
        data: {
          used_at: expect.any(Date),
        },
      });
    });

    it('deve retornar sucesso quando usuário está inativo (segurança)', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        status: 'inativo',
      });

      const result = await service.solicitarReset('usuario@teste.com');

      expect(result.sucesso).toBe(true);
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TESTES: validarToken
  // =========================================================================
  describe('validarToken', () => {
    it('deve retornar valido=true para token válido', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 min no futuro
        used_at: null,
      });

      const result = await service.validarToken('valid-token');

      expect(result.valido).toBe(true);
    });

    it('deve retornar valido=false para token inexistente', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      const result = await service.validarToken('invalid-token');

      expect(result.valido).toBe(false);
    });

    it('deve retornar valido=false para token expirado', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() - 1000), // 1 segundo no passado
        used_at: null,
      });

      const result = await service.validarToken('expired-token');

      expect(result.valido).toBe(false);
    });

    it('deve retornar valido=false para token já utilizado', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
        used_at: new Date(), // já foi usado
      });

      const result = await service.validarToken('used-token');

      expect(result.valido).toBe(false);
    });
  });

  // =========================================================================
  // TESTES: confirmarReset
  // =========================================================================
  describe('confirmarReset', () => {
    it('deve redefinir senha com token válido', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);

      const result = await service.confirmarReset('valid-token-123', 'NovaSenha@123');

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toContain('Senha redefinida com sucesso');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'password.reset.completed',
        expect.objectContaining({
          userId: mockUsuario.id,
          email: mockUsuario.email,
        }),
      );
    });

    it('deve lançar erro para token inexistente', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.confirmarReset('invalid-token', 'NovaSenha@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro para token expirado', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        ...mockToken,
        expires_at: new Date(Date.now() - 1000), // expirado
      });

      await expect(service.confirmarReset('expired-token', 'NovaSenha@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro para token já utilizado', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        ...mockToken,
        used_at: new Date(), // já utilizado
      });

      await expect(service.confirmarReset('used-token', 'NovaSenha@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro se usuário está inativo', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        ...mockToken,
        usuario: { ...mockUsuario, status: 'inativo' },
      });

      await expect(service.confirmarReset('valid-token-123', 'NovaSenha@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve chamar transaction para atualizar senha e marcar token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.confirmarReset('valid-token-123', 'NovaSenha@123');

      // Verifica que transaction foi chamada com 3 operações
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(), // update usuario (senha)
          expect.anything(), // update token (used_at)
          expect.anything(), // deleteMany (cleanup)
        ]),
      );
    });
  });

  // =========================================================================
  // TESTES: limparTokensExpirados
  // =========================================================================
  describe('limparTokensExpirados', () => {
    it('deve remover tokens expirados e usados', async () => {
      mockPrismaService.passwordResetToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.limparTokensExpirados();

      expect(result).toBe(5);
      expect(mockPrismaService.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ expires_at: { lt: expect.any(Date) } }, { used_at: { not: null } }],
        },
      });
    });
  });
});
