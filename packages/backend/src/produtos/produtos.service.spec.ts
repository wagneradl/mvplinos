import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProdutosService', () => {
  let service: ProdutosService;

  const mockProduto = {
    id: 1,
    nome: 'Pão Francês',
    preco_unitario: 0.75,
    tipo_medida: 'un',
    status: 'ativo',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
  };

  const mockCreateDto: any = {
    nome: 'Pão Francês',
    preco_unitario: 0.75,
    tipo_medida: 'un',
  };

  const mockPrismaService = {
    produto: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    itemPedido: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProdutosService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProdutosService>(ProdutosService);
  });

  // =========================================================================
  // CRIAÇÃO
  // =========================================================================

  describe('create', () => {
    it('deve criar produto com dados válidos', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);
      mockPrismaService.produto.create.mockResolvedValue(mockProduto);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockProduto);
      expect(mockPrismaService.produto.create).toHaveBeenCalledWith({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.75,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });
    });

    it('deve rejeitar nome duplicado', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'Já existe um produto com este nome',
      );
    });

    it('deve rejeitar nome duplicado case-insensitive', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue({
        ...mockProduto,
        nome: 'pão francês',
      });

      await expect(
        service.create({ ...mockCreateDto, nome: 'PÃO FRANCÊS' }),
      ).rejects.toThrow('Já existe um produto com este nome');
    });

    it('deve rejeitar quando nome está vazio', async () => {
      await expect(
        service.create({ ...mockCreateDto, nome: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar quando preco_unitario não é número', async () => {
      await expect(
        service.create({ ...mockCreateDto, preco_unitario: 'abc' as any }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...mockCreateDto, preco_unitario: 'abc' as any }),
      ).rejects.toThrow('Preço unitário deve ser um número');
    });

    it('deve fazer trim no nome antes de salvar', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);
      mockPrismaService.produto.create.mockResolvedValue({
        ...mockProduto,
        nome: 'Bolo de Chocolate',
      });

      await service.create({
        ...mockCreateDto,
        nome: '  Bolo de Chocolate  ',
      });

      expect(mockPrismaService.produto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nome: 'Bolo de Chocolate',
        }),
      });
    });

    it('deve aceitar diferentes tipos de medida (un, kg, lt)', async () => {
      for (const tipo of ['un', 'kg', 'lt']) {
        mockPrismaService.produto.findFirst.mockResolvedValue(null);
        mockPrismaService.produto.create.mockResolvedValue({
          ...mockProduto,
          tipo_medida: tipo,
        });

        const result = await service.create({
          ...mockCreateDto,
          nome: `Produto ${tipo}`,
          tipo_medida: tipo,
        });

        expect(result.tipo_medida).toBe(tipo);
      }
    });

    it('deve permitir criar produto com nome de produto soft-deleted', async () => {
      // findFirst filtra por deleted_at: null, então retorna null para soft-deleted
      mockPrismaService.produto.findFirst.mockResolvedValue(null);
      mockPrismaService.produto.create.mockResolvedValue(mockProduto);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockProduto);
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: {
          nome: 'Pão Francês',
          deleted_at: null,
        },
      });
    });

    it('deve usar status "ativo" por padrão quando não fornecido', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);
      mockPrismaService.produto.create.mockResolvedValue(mockProduto);

      await service.create({
        nome: 'Pão Francês',
        preco_unitario: 0.75,
        tipo_medida: 'un',
      } as any);

      expect(mockPrismaService.produto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'ativo' }),
      });
    });
  });

  // =========================================================================
  // LISTAGEM (findAll)
  // =========================================================================

  describe('findAll', () => {
    it('deve retornar lista paginada com metadados', async () => {
      const produtos = [mockProduto, { ...mockProduto, id: 2, nome: 'Bolo' }];
      mockPrismaService.produto.findMany.mockResolvedValue(produtos);
      mockPrismaService.produto.count.mockResolvedValue(2);

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

    it('deve filtrar por status', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto]);
      mockPrismaService.produto.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, status: 'ativo' });

      const callArgs = mockPrismaService.produto.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe('ativo');
      expect(callArgs.where.deleted_at).toBeNull();
    });

    it('deve filtrar por busca textual (nome)', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto]);
      mockPrismaService.produto.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, search: 'pão' });

      const callArgs = mockPrismaService.produto.findMany.mock.calls[0][0];
      expect(callArgs.where.nome).toEqual({ contains: 'pão' });
    });

    it('deve retornar lista vazia quando sem resultados', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([]);
      mockPrismaService.produto.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.itemCount).toBe(0);
    });

    it('deve excluir produtos soft-deleted da listagem', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([]);
      mockPrismaService.produto.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      const callArgs = mockPrismaService.produto.findMany.mock.calls[0][0];
      expect(callArgs.where.deleted_at).toBeNull();
    });

    it('deve ordenar por preco_unitario quando solicitado', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([]);
      mockPrismaService.produto.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        orderBy: 'preco_unitario',
        order: 'desc',
      });

      const callArgs = mockPrismaService.produto.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ preco_unitario: 'desc' });
    });
  });

  // =========================================================================
  // BUSCA POR ID (findOne)
  // =========================================================================

  describe('findOne', () => {
    it('deve retornar produto existente', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);

      const result = await service.findOne(1);

      expect(result).toEqual(mockProduto);
    });

    it('deve lançar NotFoundException para ID inexistente', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('deve excluir produto soft-deleted por padrão', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
    });

    it('deve incluir produto soft-deleted quando includeDeleted=true', async () => {
      const produtoDeleted = {
        ...mockProduto,
        deleted_at: new Date(),
        status: 'inativo',
      };
      mockPrismaService.produto.findFirst.mockResolvedValue(produtoDeleted);

      const result = await service.findOne(1, true);

      expect(result).toEqual(produtoDeleted);
      const callArgs = mockPrismaService.produto.findFirst.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('deleted_at');
    });
  });

  // =========================================================================
  // ATUALIZAÇÃO (update)
  // =========================================================================

  describe('update', () => {
    it('deve atualizar campos permitidos', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      const updated = { ...mockProduto, preco_unitario: 1.0 };
      mockPrismaService.produto.update.mockResolvedValue(updated);

      const result = await service.update(1, { preco_unitario: 1.0 });

      expect(result.preco_unitario).toBe(1.0);
    });

    it('deve rejeitar nome duplicado na atualização', async () => {
      // findOne retorna o produto existente
      mockPrismaService.produto.findFirst
        .mockResolvedValueOnce(mockProduto) // findOne(id)
        .mockResolvedValueOnce({
          // findFirst para verificar nome duplicado
          ...mockProduto,
          id: 2,
          nome: 'Bolo de Chocolate',
        });

      const promise = service.update(1, { nome: 'Bolo de Chocolate' });
      await expect(promise).rejects.toThrow(BadRequestException);

      // Re-setup mocks for second assertion
      mockPrismaService.produto.findFirst
        .mockResolvedValueOnce(mockProduto)
        .mockResolvedValueOnce({
          ...mockProduto,
          id: 2,
          nome: 'Bolo de Chocolate',
        });

      await expect(
        service.update(1, { nome: 'Bolo de Chocolate' }),
      ).rejects.toThrow('Já existe um produto com este nome');
    });

    it('deve lançar NotFoundException para produto inexistente', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(
        service.update(999, { preco_unitario: 2.0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve reativar produto soft-deleted ao mudar status para ativo', async () => {
      const produtoDeleted = {
        ...mockProduto,
        status: 'inativo',
        deleted_at: new Date(),
      };
      mockPrismaService.produto.findFirst.mockResolvedValue(produtoDeleted);
      mockPrismaService.produto.update.mockResolvedValue({
        ...mockProduto,
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
      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'ativo',
          deleted_at: null,
        }),
      });
    });

    it('deve fazer trim no nome na atualização', async () => {
      mockPrismaService.produto.findFirst
        .mockResolvedValueOnce(mockProduto) // findOne
        .mockResolvedValueOnce(null); // verificação de duplicata
      mockPrismaService.produto.update.mockResolvedValue({
        ...mockProduto,
        nome: 'Bolo Novo',
      });

      await service.update(1, { nome: '  Bolo Novo  ' });

      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ nome: 'Bolo Novo' }),
      });
    });
  });

  // =========================================================================
  // SOFT DELETE / DESATIVAÇÃO (remove)
  // =========================================================================

  describe('remove', () => {
    it('deve desativar produto sem pedidos vinculados', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue(null);
      mockPrismaService.produto.update.mockResolvedValue({
        ...mockProduto,
        deleted_at: new Date(),
        status: 'inativo',
      });

      const result = await service.remove(1);

      expect(result.status).toBe('inativo');
      expect(result.deleted_at).toBeDefined();
      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          deleted_at: expect.any(Date),
          status: 'inativo',
        },
      });
    });

    it('deve rejeitar desativação de produto com pedidos ativos', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue({
        id: 1,
        produto_id: 1,
        pedido_id: 10,
      });

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1)).rejects.toThrow(
        'Não é possível excluir um produto que está sendo usado em pedidos',
      );
    });

    it('deve lançar NotFoundException para produto inexistente', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException para produto já soft-deleted', async () => {
      // findFirst com deleted_at: null retorna null para produto já deletado
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
