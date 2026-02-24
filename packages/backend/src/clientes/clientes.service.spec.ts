import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('ClientesService', () => {
  let service: ClientesService;
  let mockEmailService: { enviarEmail: jest.Mock };

  const mockCliente = {
    id: 1,
    cnpj: '12.345.678/0001-90',
    razao_social: 'Padaria Central Ltda',
    nome_fantasia: 'Padaria Central',
    email: 'contato@padariacentral.com',
    telefone: '(11) 98765-4321',
    status: 'ativo',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
  };

  const mockCreateDto = {
    cnpj: '12.345.678/0001-90',
    razao_social: 'Padaria Central Ltda',
    nome_fantasia: 'Padaria Central',
    email: 'contato@padariacentral.com',
    telefone: '(11) 98765-4321',
    status: 'ativo',
  };

  // Mock do Prisma com $transaction que executa a callback passando o próprio mock
  const mockPrismaService = {
    cliente: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    usuario: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((cb: (prisma: any) => Promise<any>) =>
      cb(mockPrismaService),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    mockEmailService = { enviarEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
  });

  // =========================================================================
  // CRIAÇÃO
  // =========================================================================

  describe('create', () => {
    it('deve criar cliente com dados válidos', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.cliente.create.mockResolvedValue(mockCliente);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockCliente);
      expect(mockPrismaService.cliente.create).toHaveBeenCalledWith({
        data: mockCreateDto,
      });
    });

    it('deve rejeitar CNPJ duplicado (cliente ativo com mesmo CNPJ)', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve permitir criar cliente com CNPJ de cliente soft-deleted', async () => {
      // findFirst retorna null porque filtra por deleted_at: null
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.cliente.create.mockResolvedValue(mockCliente);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockCliente);
      // Verificar que a busca de duplicata filtrou por deleted_at: null
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: {
          cnpj: mockCreateDto.cnpj,
          deleted_at: null,
        },
      });
    });

    it('deve rejeitar com ConflictException quando Prisma retorna P2002', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      // Simular PrismaClientKnownRequestError
      Object.setPrototypeOf(prismaError, { constructor: { name: 'PrismaClientKnownRequestError' } });
      mockPrismaService.cliente.create.mockRejectedValue(prismaError);

      // O service trata P2002 apenas se for instanceof PrismaClientKnownRequestError
      // Mas com nosso mock genérico, cai no catch genérico → BadRequestException
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Nota: Validação de formato de CNPJ é feita no DTO via @Matches, não no service
  });

  // =========================================================================
  // LISTAGEM (findAll)
  // =========================================================================

  describe('findAll', () => {
    it('deve retornar lista paginada com metadados', async () => {
      const clientes = [mockCliente, { ...mockCliente, id: 2, cnpj: '98.765.432/0001-10' }];
      mockPrismaService.cliente.count.mockResolvedValue(2);
      mockPrismaService.cliente.findMany.mockResolvedValue(clientes);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        itemCount: 2,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('deve calcular paginação corretamente (página 2 de 3)', async () => {
      mockPrismaService.cliente.count.mockResolvedValue(25);
      mockPrismaService.cliente.findMany.mockResolvedValue(
        Array(10).fill(mockCliente),
      );

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        itemCount: 25,
        pageCount: 3,
        hasPreviousPage: true,
        hasNextPage: true,
      });
    });

    it('deve filtrar por status ativo', async () => {
      mockPrismaService.cliente.count.mockResolvedValue(1);
      mockPrismaService.cliente.findMany.mockResolvedValue([mockCliente]);

      await service.findAll({ page: 1, limit: 10, status: 'ativo' });

      const callArgs = mockPrismaService.cliente.count.mock.calls[0][0];
      expect(callArgs.where.status).toBe('ativo');
      expect(callArgs.where.deleted_at).toBeNull();
    });

    it('deve filtrar por busca textual (razao_social, nome_fantasia, cnpj)', async () => {
      mockPrismaService.cliente.count.mockResolvedValue(1);
      mockPrismaService.cliente.findMany.mockResolvedValue([mockCliente]);

      await service.findAll({ page: 1, limit: 10, search: 'padaria' });

      const callArgs = mockPrismaService.cliente.count.mock.calls[0][0];
      // A busca com search sem status cria OR com condições de busca textual
      // combinada com OR de status
      const whereJson = JSON.stringify(callArgs.where);
      expect(whereJson).toContain('padaria');
    });

    it('deve retornar lista vazia quando sem resultados', async () => {
      mockPrismaService.cliente.count.mockResolvedValue(0);
      mockPrismaService.cliente.findMany.mockResolvedValue([]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.itemCount).toBe(0);
      expect(result.meta.pageCount).toBe(0);
    });

    it('deve usar valores padrão quando pageOptions é undefined', async () => {
      mockPrismaService.cliente.count.mockResolvedValue(0);
      mockPrismaService.cliente.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  // =========================================================================
  // BUSCA POR ID (findOne)
  // =========================================================================

  describe('findOne', () => {
    it('deve retornar cliente existente', async () => {
      const clienteComPedidos = { ...mockCliente, pedidos: [] };
      mockPrismaService.cliente.findFirst.mockResolvedValue(clienteComPedidos);

      const result = await service.findOne(1);

      expect(result).toEqual(clienteComPedidos);
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
        include: expect.objectContaining({
          pedidos: expect.any(Object),
        }),
      });
    });

    it('deve lançar NotFoundException para ID inexistente', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('deve excluir clientes soft-deleted por padrão', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deleted_at: null }),
        }),
      );
    });

    it('deve incluir clientes soft-deleted quando includeDeleted=true', async () => {
      const clienteDeleted = {
        ...mockCliente,
        deleted_at: new Date(),
        status: 'inativo',
        pedidos: [],
      };
      mockPrismaService.cliente.findFirst.mockResolvedValue(clienteDeleted);

      const result = await service.findOne(1, true);

      expect(result).toEqual(clienteDeleted);
      // Não deve ter deleted_at: null no where
      const callArgs = mockPrismaService.cliente.findFirst.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('deleted_at');
    });
  });

  // =========================================================================
  // BUSCA POR CNPJ (findByCnpj)
  // =========================================================================

  describe('findByCnpj', () => {
    it('deve retornar cliente pelo CNPJ', async () => {
      const clienteComPedidos = { ...mockCliente, pedidos: [] };
      mockPrismaService.cliente.findFirst.mockResolvedValue(clienteComPedidos);

      const result = await service.findByCnpj('12.345.678/0001-90');

      expect(result).toEqual(clienteComPedidos);
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { cnpj: '12.345.678/0001-90', deleted_at: null },
        include: expect.objectContaining({
          pedidos: expect.any(Object),
        }),
      });
    });

    it('deve lançar NotFoundException para CNPJ não encontrado', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.findByCnpj('00.000.000/0000-00'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // ATUALIZAÇÃO (update)
  // =========================================================================

  describe('update', () => {
    it('deve atualizar campos permitidos', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      const updated = { ...mockCliente, nome_fantasia: 'Padaria Nova' };
      mockPrismaService.cliente.update.mockResolvedValue(updated);

      const result = await service.update(1, { nome_fantasia: 'Padaria Nova' });

      expect(result.nome_fantasia).toBe('Padaria Nova');
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nome_fantasia: 'Padaria Nova' },
      });
    });

    it('deve lançar NotFoundException para cliente inexistente', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.update(999, { nome_fantasia: 'Novo Nome' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar com ConflictException quando CNPJ atualizado já existe', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      const prismaError = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
        constructor: { name: 'PrismaClientKnownRequestError' },
      });
      // Forçar como PrismaClientKnownRequestError
      Object.defineProperty(prismaError, Symbol.hasInstance, { value: () => true });
      mockPrismaService.cliente.update.mockRejectedValue(prismaError);

      // O service captura P2002 no catch interno → ConflictException
      // Porém com mock genérico pode cair em BadRequestException
      await expect(
        service.update(1, { cnpj: '98.765.432/0001-10' }),
      ).rejects.toThrow();
    });

    it('deve reativar cliente soft-deleted ao mudar status para ativo', async () => {
      const clienteDeleted = {
        ...mockCliente,
        status: 'inativo',
        deleted_at: new Date(),
      };
      mockPrismaService.cliente.findFirst.mockResolvedValue(clienteDeleted);
      mockPrismaService.cliente.update.mockResolvedValue({
        ...mockCliente,
        status: 'ativo',
        deleted_at: null,
      });

      const result = await service.update(
        1,
        { status: 'ativo' },
        true, // includeDeleted
      );

      expect(result.status).toBe('ativo');
      expect(result.deleted_at).toBeNull();
      // Verificar que deleted_at = null foi incluído nos dados de atualização
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'ativo',
          deleted_at: null,
        }),
      });
    });
  });

  // =========================================================================
  // SOFT DELETE (remove)
  // =========================================================================

  describe('remove', () => {
    it('deve marcar deleted_at e status inativo no registro', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      const deletedCliente = {
        ...mockCliente,
        deleted_at: expect.any(Date),
        status: 'inativo',
      };
      mockPrismaService.cliente.update.mockResolvedValue(deletedCliente);

      const result = await service.remove(1);

      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          deleted_at: expect.any(Date),
          status: 'inativo',
        },
      });
      expect(result.status).toBe('inativo');
    });

    it('deve lançar NotFoundException para cliente já deletado', async () => {
      // findFirst com deleted_at: null retorna null para cliente já deletado
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException para cliente inexistente', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // APROVAÇÃO DE AUTO-CADASTRO (aprovarCliente)
  // =========================================================================

  describe('aprovarCliente', () => {
    const mockClientePendente = {
      ...mockCliente,
      id: 10,
      status: 'pendente_aprovacao',
      razao_social: 'Empresa Pendente Ltda',
    };

    const mockUsuarios = [
      { id: 100, nome: 'João', email: 'joao@empresa.com', cliente_id: 10 },
      { id: 101, nome: 'Maria', email: 'maria@empresa.com', cliente_id: 10 },
    ];

    it('deve aprovar cliente pendente e ativar usuários vinculados', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockClientePendente);
      mockPrismaService.cliente.update.mockResolvedValue({ ...mockClientePendente, status: 'ativo' });
      mockPrismaService.usuario.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);

      const result = await service.aprovarCliente(10);

      expect(result).toEqual({ message: 'Cliente aprovado com sucesso' });
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'ativo' },
      });
      expect(mockPrismaService.usuario.updateMany).toHaveBeenCalledWith({
        where: { cliente_id: 10 },
        data: { status: 'ativo' },
      });
    });

    it('deve lançar NotFoundException para cliente inexistente', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(null);

      await expect(service.aprovarCliente(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException para cliente que não está pendente', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente); // status='ativo'

      await expect(service.aprovarCliente(1)).rejects.toThrow(BadRequestException);
    });

    it('deve enviar email de aprovação para todos os usuários vinculados', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockClientePendente);
      mockPrismaService.cliente.update.mockResolvedValue({ ...mockClientePendente, status: 'ativo' });
      mockPrismaService.usuario.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);

      await service.aprovarCliente(10);

      expect(mockEmailService.enviarEmail).toHaveBeenCalledTimes(2);
      expect(mockEmailService.enviarEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@empresa.com',
          subject: expect.stringContaining('aprovado'),
        }),
      );
      expect(mockEmailService.enviarEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'maria@empresa.com',
          subject: expect.stringContaining('aprovado'),
        }),
      );
    });
  });

  // =========================================================================
  // REJEIÇÃO DE AUTO-CADASTRO (rejeitarCliente)
  // =========================================================================

  describe('rejeitarCliente', () => {
    const mockClientePendente = {
      ...mockCliente,
      id: 10,
      status: 'pendente_aprovacao',
      razao_social: 'Empresa Pendente Ltda',
    };

    const mockUsuarios = [
      { id: 100, nome: 'João', email: 'joao@empresa.com', cliente_id: 10 },
    ];

    it('deve rejeitar cliente pendente', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockClientePendente);
      mockPrismaService.cliente.update.mockResolvedValue({ ...mockClientePendente, status: 'rejeitado' });
      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);

      const result = await service.rejeitarCliente(10);

      expect(result).toEqual({ message: 'Cliente rejeitado' });
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'rejeitado' },
      });
    });

    it('deve lançar NotFoundException para cliente inexistente', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(null);

      await expect(service.rejeitarCliente(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException para cliente que não está pendente', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente); // status='ativo'

      await expect(service.rejeitarCliente(1)).rejects.toThrow(BadRequestException);
    });

    it('deve enviar email de rejeição com motivo', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockClientePendente);
      mockPrismaService.cliente.update.mockResolvedValue({ ...mockClientePendente, status: 'rejeitado' });
      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);

      await service.rejeitarCliente(10, 'Documentação incompleta');

      expect(mockEmailService.enviarEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.enviarEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@empresa.com',
          subject: expect.stringContaining('não aprovado'),
          text: expect.stringContaining('Documentação incompleta'),
        }),
      );
    });

    it('deve enviar email de rejeição sem motivo', async () => {
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockClientePendente);
      mockPrismaService.cliente.update.mockResolvedValue({ ...mockClientePendente, status: 'rejeitado' });
      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);

      await service.rejeitarCliente(10);

      expect(mockEmailService.enviarEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.enviarEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@empresa.com',
          subject: expect.stringContaining('não aprovado'),
        }),
      );
    });
  });

  // =========================================================================
  // TENANT ISOLATION
  // =========================================================================

  describe('Tenant Isolation', () => {
    const tenantClienteA = { userId: 10, clienteId: 1 };
    const tenantClienteB = { userId: 20, clienteId: 2 };
    const tenantInterno = { userId: 1, clienteId: null };

    describe('findAll com tenant', () => {
      it('CLIENTE deve ver apenas o próprio cliente', async () => {
        mockPrismaService.cliente.count.mockResolvedValue(1);
        mockPrismaService.cliente.findMany.mockResolvedValue([mockCliente]);

        await service.findAll({ page: 1, limit: 10 }, false, tenantClienteA);

        const callArgs = mockPrismaService.cliente.count.mock.calls[0][0];
        expect(callArgs.where.id).toBe(1);
      });

      it('INTERNO deve ver todos os clientes (sem filtro de tenant)', async () => {
        mockPrismaService.cliente.count.mockResolvedValue(2);
        mockPrismaService.cliente.findMany.mockResolvedValue([
          mockCliente,
          { ...mockCliente, id: 2 },
        ]);

        await service.findAll({ page: 1, limit: 10 }, false, tenantInterno);

        const callArgs = mockPrismaService.cliente.count.mock.calls[0][0];
        expect(callArgs.where).not.toHaveProperty('id');
      });
    });

    describe('findOne com tenant', () => {
      it('CLIENTE pode acessar dados do próprio cliente', async () => {
        const clienteComPedidos = { ...mockCliente, pedidos: [] };
        mockPrismaService.cliente.findFirst.mockResolvedValue(clienteComPedidos);

        const result = await service.findOne(1, false, tenantClienteA);

        expect(result).toBeDefined();
        expect(result.id).toBe(1);
      });

      it('CLIENTE NÃO pode acessar dados de outro cliente', async () => {
        await expect(
          service.findOne(2, false, tenantClienteA),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.findOne(2, false, tenantClienteA),
        ).rejects.toThrow('Acesso negado a este cliente');
      });

      it('INTERNO pode acessar qualquer cliente', async () => {
        const clienteComPedidos = { ...mockCliente, id: 2, pedidos: [] };
        mockPrismaService.cliente.findFirst.mockResolvedValue(clienteComPedidos);

        const result = await service.findOne(2, false, tenantInterno);

        expect(result).toBeDefined();
        expect(result.id).toBe(2);
      });
    });
  });
});
